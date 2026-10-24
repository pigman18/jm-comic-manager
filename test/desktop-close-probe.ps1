param([string]$ExePath)
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:TEMP ('jm-confirm-' + [guid]::NewGuid().ToString('N').Substring(0,8))
$appdata = Join-Path $root 'appdata'
New-Item -ItemType Directory -Force -Path $appdata | Out-Null
$old = $env:APPDATA
$env:APPDATA = $appdata
$proc = $null
try {
    $sig = @'
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public class W {
  [DllImport("user32.dll", SetLastError=true)] public static extern bool PostMessage(IntPtr h, uint m, IntPtr w, IntPtr l);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetWindowText(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll", CharSet=CharSet.Unicode)] public static extern int GetClassName(IntPtr h, StringBuilder s, int n);
  [DllImport("user32.dll")] public static extern bool IsWindowVisible(IntPtr h);
  [DllImport("user32.dll")] public static extern bool EnumWindows(EnumProc cb, IntPtr p);
  [DllImport("user32.dll")] public static extern bool EnumChildWindows(IntPtr parent, EnumProc cb, IntPtr p);
  [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
  public delegate bool EnumProc(IntPtr h, IntPtr p);

  public class WinInfo { public long Handle; public uint Pid; public string Title; public string Cls; public bool Visible; }
  public static List<WinInfo> List(uint targetPid) {
    var list = new List<WinInfo>();
    EnumWindows((h, p) => {
      uint pid; GetWindowThreadProcessId(h, out pid);
      if (pid == targetPid) {
        var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
        var cb = new StringBuilder(256); GetClassName(h, cb, 256);
        list.Add(new WinInfo { Handle = h.ToInt64(), Pid = pid, Title = sb.ToString(), Cls = cb.ToString(), Visible = IsWindowVisible(h) });
      }
      return true;
    }, IntPtr.Zero);
    return list;
  }
  public static List<WinInfo> Children(long parent) {
    var list = new List<WinInfo>();
    EnumChildWindows(new IntPtr(parent), (h, p) => {
      var sb = new StringBuilder(512); GetWindowText(h, sb, 512);
      var cb = new StringBuilder(256); GetClassName(h, cb, 256);
      list.Add(new WinInfo { Handle = h.ToInt64(), Title = sb.ToString(), Cls = cb.ToString(), Visible = IsWindowVisible(h) });
      return true;
    }, IntPtr.Zero);
    return list;
  }
}
'@
    Add-Type -TypeDefinition $sig

    function Show-Wins([string]$tag) {
        $wins = [W]::List([uint32]$proc.Id)
        Write-Output "$tag 顶层窗口数=$($wins.Count)"
        foreach ($w in $wins) {
            Write-Output ("   hwnd={0} vis={1} cls='{2}' title='{3}'" -f $w.Handle, $w.Visible, $w.Cls, $w.Title)
        }
        return $wins
    }

    $proc = Start-Process -FilePath $ExePath -PassThru
    $ok = $false
    for ($i = 0; $i -lt 45; $i++) {
        Start-Sleep -Milliseconds 1000
        if ($proc.HasExited) { Write-Output "启动即退出"; return }
        try { if ((Invoke-WebRequest -Uri 'http://127.0.0.1:47310/index.html' -UseBasicParsing -TimeoutSec 3).StatusCode -eq 200) { $ok = $true; break } } catch {}
    }
    Write-Output "1) 启动 OK=$ok  pid=$($proc.Id)"
    if (-not $ok) { return }

    Start-Sleep -Milliseconds 1500
    $wins = Show-Wins '2)'
    $main = $wins | Where-Object { $_.Visible -and $_.Title -like '*JM*' } | Select-Object -First 1
    if (-not $main) { Write-Output '!! 找不到主窗口，放弃'; return }
    Write-Output "   主窗口 hwnd=$($main.Handle)"

    # ---- A. 点 X，检查是否弹确认框 ----
    Write-Output '3) 发送 WM_CLOSE 到主窗口（模拟点 X）...'
    [W]::PostMessage([IntPtr]$main.Handle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
    Start-Sleep -Seconds 2
    Write-Output "   进程存活=$(-not $proc.HasExited)  (期望 True：应弹确认框而非直接退出)"

    $wins2 = Show-Wins '4)'
    $dlg = $wins2 | Where-Object { $_.Cls -eq '#32770' -or ($_.Handle -ne $main.Handle -and $_.Visible) } | Select-Object -First 1
    if (-not $dlg) {
        Write-Output '5) !! 没有确认框'
        Write-Output "   进程存活=$(-not $proc.HasExited)"
    } else {
        Write-Output "5) 确认框 hwnd=$($dlg.Handle) cls='$($dlg.Cls)' title='$($dlg.Title)'"
        $kids = [W]::Children($dlg.Handle)
        foreach ($k in $kids) { Write-Output ("   子控件 hwnd={0} cls='{1}' text='{2}'" -f $k.Handle, $k.Cls, $k.Title) }
        $buttons = $kids | Where-Object { $_.Cls -eq 'Button' }
        $cancelBtn = $buttons | Where-Object { $_.Title -match '否|取消|No|Cancel' } | Select-Object -First 1
        $okBtn = $buttons | Where-Object { $_.Title -match '是|确定|Yes|OK' } | Select-Object -First 1

        # ---- B. 点「取消/否」，应留在应用内 ----
        if ($cancelBtn) {
            Write-Output "6) 点击「$($cancelBtn.Title)」(hwnd=$($cancelBtn.Handle)) BM_CLICK..."
            [W]::PostMessage([IntPtr]$cancelBtn.Handle, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
            Start-Sleep -Seconds 2
            Write-Output "   取消后进程存活=$(-not $proc.HasExited)  (期望 True)"
            $w3 = [W]::List([uint32]$proc.Id)
            $m3 = $w3 | Where-Object { $_.Handle -eq $main.Handle }
            Write-Output "   取消后主窗口存在=$([bool]$m3) 可见=$(if($m3){$m3.Visible}else{'n/a'})  (期望 True/True)"
            try {
                $r = Invoke-WebRequest -Uri 'http://127.0.0.1:47310/index.html' -UseBasicParsing -TimeoutSec 3
                Write-Output "   取消后服务仍可访问=$($r.StatusCode -eq 200)  (期望 True)"
            } catch { Write-Output "   取消后服务仍可访问=False" }
        } else {
            Write-Output '6) !! 找不到取消按钮，跳过取消测试'
        }

        # ---- C. 再点 X，点「是」，应退出 ----
        Write-Output '7) 再次发送 WM_CLOSE，然后点确认按钮...'
        [W]::PostMessage([IntPtr]$main.Handle, 0x0010, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
        Start-Sleep -Seconds 2
        $wins4 = [W]::List([uint32]$proc.Id)
        $dlg2 = $wins4 | Where-Object { $_.Cls -eq '#32770' } | Select-Object -First 1
        if (-not $dlg2) {
            Write-Output '   !! 第二次没弹确认框'
        } else {
            $kids2 = [W]::Children($dlg2.Handle)
            $btn2 = $kids2 | Where-Object { $_.Cls -eq 'Button' -and $_.Title -match '是|确定|Yes|OK' } | Select-Object -First 1
            if (-not $btn2) { $btn2 = $kids2 | Where-Object { $_.Cls -eq 'Button' } | Select-Object -Last 1 }
            Write-Output "   点击「$($btn2.Title)」(hwnd=$($btn2.Handle))..."
            [W]::PostMessage([IntPtr]$btn2.Handle, 0x00F5, [IntPtr]::Zero, [IntPtr]::Zero) | Out-Null
        }
        $exited = $proc.WaitForExit(15000)
        Write-Output "8) 确认后进程已退出=$exited  (期望 True)"
        if (-not $exited) {
            Write-Output '   !! 15 秒内没退出'
        } else {
            Start-Sleep -Seconds 2
            # 只统计「真正被进程占用」的连接。
            # 进程退出后 TCP 会留下 TimeWait 状态的条目（OwningProcess=0），
            # 那是内核回收期，不代表端口泄漏，不能算作占用。
            $portUsed = $false
            try {
                $conns = Get-NetTCPConnection -LocalPort 47310 -ErrorAction SilentlyContinue
                $portUsed = [bool]($conns | Where-Object { $_.State -ne 'TimeWait' -and $_.OwningProcess -gt 0 })
            } catch {}
            Write-Output "   端口 47310 已释放=$(-not $portUsed)  (期望 True)"
            $left = Get-Process -ErrorAction SilentlyContinue | Where-Object { $_.ProcessName -like '*JM*' }
            Write-Output "   残留同名进程数=$(@($left).Count)  (期望 0)"
        }
    }

    Write-Output '=== 日志全文（过滤掉 evaluate 噪音）==='
    $log = Join-Path $appdata 'JmComicManager\jm-desktop.log'
    if (Test-Path $log) {
        $lines = Get-Content $log
        Write-Output "   日志总行数=$($lines.Count)"
        $noise = @($lines | Where-Object { $_ -match 'Cannot call evaluate' }).Count
        Write-Output "   'Cannot call evaluate' 行数=$noise"
        $lines | Where-Object { $_ -notmatch 'Cannot call evaluate' } | ForEach-Object { Write-Output "   $_" }
    } else { Write-Output "(无日志 $log)" }
} finally {
    if ($proc -and -not $proc.HasExited) { & taskkill /PID $proc.Id /T /F 2>&1 | Out-Null }
    $env:APPDATA = $old
    Start-Sleep -Milliseconds 300
    Remove-Item -Recurse -Force $root -ErrorAction SilentlyContinue
}
