# 独立探针：把 desktop 的 final exe 放到干净环境跑，抓完整输出
# 用途：GUI 子系统会吞掉 stderr，必须先确认是否真崩、卡在哪一步
param(
  [Parameter(Mandatory = $true)][string]$ExePath,
  [int]$WaitSeconds = 20
)

$ErrorActionPreference = 'Stop'
$root = Join-Path $env:TEMP ('jm-diag-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
$appdata = Join-Path $root 'appdata'
New-Item -ItemType Directory -Force -Path $appdata | Out-Null
$old = $env:APPDATA
$env:APPDATA = $appdata
$proc = $null
try {
  $src = Split-Path -Parent $ExePath
  Copy-Item (Join-Path $src '*') $root -Recurse -Force
  $exe = Join-Path $root (Split-Path -Leaf $ExePath)

  Write-Output "工作目录: $root"
  Write-Output "exe: $exe ($((Get-Item $exe).Length) bytes)"

  # 先让 debug=true，这样会尝试开控制台并把日志写文件
  $cfgDir = Join-Path $appdata 'JmComicManager'
  New-Item -ItemType Directory -Force -Path $cfgDir | Out-Null
  Set-Content -LiteralPath (Join-Path $cfgDir 'config.json') -Value '{"debug":true}' -Encoding utf8

  $proc = Start-Process -FilePath $exe -PassThru `
    -RedirectStandardOutput (Join-Path $root 'stdout.txt') `
    -RedirectStandardError (Join-Path $root 'stderr.txt')

  Write-Output "启动 pid=$($proc.Id)，等待 $WaitSeconds 秒..."
  for ($i = 0; $i -lt $WaitSeconds; $i++) {
    Start-Sleep -Seconds 1
    if ($proc.HasExited) {
      Write-Output "→ 进程在第 $($i+1) 秒退出，退出码 $($proc.ExitCode)"
      break
    }
    # 一旦服务可用就认为启动成功
    try {
      if ((Invoke-WebRequest -Uri 'http://127.0.0.1:47310/index.html' -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) {
        Write-Output "→ 第 $($i+1) 秒服务已可用（启动成功）"
        break
      }
    } catch {}
  }

  if ($proc -and -not $proc.HasExited) {
    Write-Output '→ 进程仍在运行'
  }

  Write-Output ''
  Write-Output '=== stdout ==='
  $o = Join-Path $root 'stdout.txt'
  if (Test-Path $o) { Get-Content $o -ErrorAction SilentlyContinue | Select-Object -First 40 } else { '(无)' }

  Write-Output ''
  Write-Output '=== stderr ==='
  $e = Join-Path $root 'stderr.txt'
  if (Test-Path $e) { Get-Content $e -ErrorAction SilentlyContinue | Select-Object -First 40 } else { '(无)' }

  Write-Output ''
  Write-Output '=== appdata 文件 ==='
  Get-ChildItem $appdata -Recurse -File -ErrorAction SilentlyContinue |
    ForEach-Object { "{0}  {1} bytes" -f $_.FullName.Substring($appdata.Length + 1), $_.Length }

  Write-Output ''
  Write-Output '=== jm-desktop.log 尾部 ==='
  $log = Get-ChildItem $appdata -Recurse -Filter 'jm-desktop.log' -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($log) { Get-Content $log.FullName -Tail 40 -ErrorAction SilentlyContinue } else { '(无日志文件)' }
} finally {
  if ($proc -and -not $proc.HasExited) { & taskkill /PID $proc.Id /T /F 2>&1 | Out-Null }
  $env:APPDATA = $old
  Start-Sleep -Milliseconds 300
  # 保留目录供排查，打印路径
  Write-Output ''
  Write-Output "排查目录: $root"
}
