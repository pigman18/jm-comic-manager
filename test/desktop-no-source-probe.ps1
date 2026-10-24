# 决定性实验：验证 pkg 打包的 exe 在「源码目录消失」后是否仍能启动
#
# 背景：1.0.0~1.0.2 的桌面端 exe 内固化了构建机绝对路径
#   import(pathToFileURL('C:/code/jm-comic-manager/packages/desktop/app.js'))
# 但用户反馈"很久以前机器上存着 1.0.0，把工程删掉了也正常运行"。
#
# pkg 的 prelude 里有 FLAG_ENABLE_PROJECT 回退逻辑（Module._resolveFilename
# 在 MODULE_NOT_FOUND 后会启用 project 模式重试），可能把绝对路径重定向回快照。
# 因此不能只看二进制里有没有绝对路径就下结论，必须实测。
#
# 做法：把整个仓库目录临时改名（模拟"工程被删/机器上没有源码"），
# 再运行 1.0.2 的 exe，看能否启动。
param(
  [Parameter(Mandatory = $true)][string]$ExePath,
  [string]$Port = '47310'
)

$ErrorActionPreference = 'Stop'

# 1) 准备一个干净运行目录
$runDir = Join-Path $env:TEMP ('jm-path-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
$srcDir = Split-Path -Parent $ExePath
Copy-Item (Join-Path $srcDir '*') $runDir -Recurse -Force
$exe = Join-Path $runDir (Split-Path -Leaf $ExePath)

$appdata = Join-Path $runDir 'appdata'
New-Item -ItemType Directory -Force -Path (Join-Path $appdata 'JmComicManager') | Out-Null
Set-Content -LiteralPath (Join-Path $appdata 'JmComicManager\config.json') -Value '{"debug":true}' -Encoding utf8

# 2) 立刻把仓库改名（关键步骤）
$repo = 'C:\code\jm-comic-manager'
$hidden = 'C:\code\jm-comic-manager__HIDDEN_FOR_TEST'
$renamed = $false
if (Test-Path $repo) {
  try {
    Rename-Item -LiteralPath $repo -NewName (Split-Path -Leaf $hidden) -ErrorAction Stop
    $renamed = $true
    Write-Output "[准备] 仓库已临时改名为 $hidden（模拟源码不存在）"
  } catch {
    Write-Output "[准备] !! 仓库无法改名: $($_.Exception.Message)"
    Write-Output "       本实验无法进行（多半是工作目录被占用）"
    Remove-Item -Recurse -Force $runDir -ErrorAction SilentlyContinue
    exit 2
  }
}

$proc = $null
try {
  $oldAppData = $env:APPDATA
  $env:APPDATA = $appdata

  $proc = Start-Process -FilePath $exe -PassThru `
    -RedirectStandardOutput (Join-Path $runDir 'stdout.txt') `
    -RedirectStandardError (Join-Path $runDir 'stderr.txt')

  $ok = $false
  for ($i = 0; $i -lt 40; $i++) {
    Start-Sleep -Milliseconds 800
    if ($proc.HasExited) {
      Write-Output "[结果] 进程退出，退出码=$($proc.ExitCode)"
      break
    }
    try {
      if ((Invoke-WebRequest "http://127.0.0.1:$Port/index.html" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) {
        $ok = $true
        Write-Output "[结果] 第 $($i+1) 次探测：服务可用 ✅ 启动成功"
        break
      }
    } catch {}
  }

  if (-not $proc.HasExited) {
    Write-Output "[结果] 进程保持运行"
    & taskkill /PID $proc.Id /T /F 2>&1 | Out-Null
  }

  Write-Output ''
  Write-Output '=== stderr ==='
  $errFile = Join-Path $runDir 'stderr.txt'
  if (Test-Path $errFile) {
    $err = Get-Content $errFile -ErrorAction SilentlyContinue
    if ($err) { $err | Select-Object -First 25 } else { '(空)' }
  }

  Write-Output ''
  Write-Output '=== stdout ==='
  $outFile = Join-Path $runDir 'stdout.txt'
  if (Test-Path $outFile) {
    $o = Get-Content $outFile -ErrorAction SilentlyContinue
    if ($o) { $o | Select-Object -First 20 } else { '(空)' }
  }

  Write-Output ''
  Write-Output '=== 日志 ==='
  $log = Join-Path $appdata 'JmComicManager\jm-desktop.log'
  if (Test-Path $log) { Get-Content $log -Tail 25 } else { '(无日志)' }

  Write-Output ''
  Write-Output "=== 结论：源码目录不存在时启动 $(if($ok){'成功 → pkg 有路径重定向，旧 exe 是好的'}else{'失败 → 旧 exe 确实绑死了构建机路径'}) ==="
} finally {
  if ($proc -and -not $proc.HasExited) { & taskkill /PID $proc.Id /T /F 2>&1 | Out-Null }
  $env:APPDATA = $oldAppData
  Start-Sleep -Milliseconds 500
  if ($renamed -and (Test-Path $hidden)) {
    Rename-Item -LiteralPath $hidden -NewName 'jm-comic-manager' -Force
    Write-Output '[收尾] 仓库已恢复'
  }
  Remove-Item -Recurse -Force $runDir -ErrorAction SilentlyContinue
}
