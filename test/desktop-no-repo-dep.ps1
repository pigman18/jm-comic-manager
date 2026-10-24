# 验证 desktop exe 是否依赖「构建机源码目录」
#
# 背景：1.0.3 早期构建用 pkg 的 .cjs bootstrap + ESM import() 加载 app.js，
# import() 不走 pkg 的路径重定向，所以 exe 会去真实文件系统找
#   C:/code/jm-comic-manager/packages/desktop/app.js
# 仓库一改名就启动失败。修复方案是 esbuild 打单文件 CJS，彻底摆脱这条依赖。
#
# 本脚本用「把 app.js 临时改名」的方式验证 exe 是否还依赖它：
#   - 改名后仍能启动 → 不依赖，修复有效
#   - 改名后启动失败 → 仍依赖，未修好
#
# 用法：pwsh -File test\desktop-no-repo-dep.ps1 -ExeDir <exe 所在目录>
param(
  [Parameter(Mandatory = $true)][string]$ExeDir,
  [string]$Port = '47310'
)

$ErrorActionPreference = 'Stop'

$repoAppJs = 'C:\code\jm-comic-manager\packages\desktop\app.js'
$hidden = "$repoAppJs.HIDDEN_FOR_TEST"

# 1) 复制 exe 到隔离目录（不依赖仓库）
$runDir = Join-Path $env:TEMP ('jm-nodep-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
New-Item -ItemType Directory -Force -Path $runDir | Out-Null
Copy-Item (Join-Path $ExeDir '*') $runDir -Recurse -Force -ErrorAction SilentlyContinue
$exe = Join-Path $runDir 'JM漫画管理器.exe'
if (-not (Test-Path $exe)) {
  Write-Output "[错误] 找不到 exe: $exe"
  exit 1
}

$appdata = Join-Path $runDir 'appdata'
New-Item -ItemType Directory -Force -Path (Join-Path $appdata 'JmComicManager') | Out-Null
Set-Content -LiteralPath (Join-Path $appdata 'JmComicManager\config.json') -Value '{"debug":true}' -Encoding utf8

# 2) 关键步骤：把仓库里的 app.js 临时改名（模拟「仓库被改名/删除」）
$renamed = $false
if (Test-Path $repoAppJs) {
  try {
    Rename-Item -LiteralPath $repoAppJs -NewName 'app.js.HIDDEN_FOR_TEST' -ErrorAction Stop
    $renamed = $true
    Write-Output '[准备] 已把仓库的 app.js 临时改名（模拟源码不存在）'
  } catch {
    Write-Output "[准备] !! 无法改名 app.js: $($_.Exception.Message)"
    Write-Output '       请关闭占用该文件的程序后重试'
    Remove-Item -Recurse -Force $runDir -ErrorAction SilentlyContinue
    exit 2
  }
} else {
  Write-Output '[准备] 仓库的 app.js 本来就不存在，直接测试'
}

$proc = $null
$oldAppData = $env:APPDATA
try {
  $env:APPDATA = $appdata

  $proc = Start-Process -FilePath $exe -PassThru -WorkingDirectory 'C:\Windows' `
    -RedirectStandardOutput (Join-Path $runDir 'stdout.txt') `
    -RedirectStandardError (Join-Path $runDir 'stderr.txt')

  $ok = $false
  for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Milliseconds 700
    if ($proc.HasExited) {
      Write-Output "[结果] 进程退出，退出码=$($proc.ExitCode)"
      break
    }
    try {
      if ((Invoke-WebRequest "http://127.0.0.1:$Port/index.html" -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200) {
        $ok = $true
        Write-Output "[结果] 第 $($i+1) 次探测：服务可用"
        break
      }
    } catch {}
  }

  $winHandle = 0
  if (-not $proc.HasExited) {
    $winHandle = (Get-Process -Id $proc.Id -ErrorAction SilentlyContinue).MainWindowHandle
    & taskkill /PID $proc.Id /T /F 2>&1 | Out-Null
  }

  Write-Output ''
  Write-Output '=== stderr ==='
  $errFile = Join-Path $runDir 'stderr.txt'
  if (Test-Path $errFile) {
    $err = Get-Content $errFile -ErrorAction SilentlyContinue
    if ($err) { $err | Select-Object -First 20 } else { '(空)' }
  }

  Write-Output ''
  Write-Output '=== stdout ==='
  $outFile = Join-Path $runDir 'stdout.txt'
  if (Test-Path $outFile) {
    $o = Get-Content $outFile -ErrorAction SilentlyContinue
    if ($o) { $o | Select-Object -First 15 } else { '(空)' }
  }

  Write-Output ''
  if ($ok) {
    Write-Output '=== 结论：app.js 不存在时仍能启动 → exe 不依赖源码目录，修复有效 ==='
  } else {
    Write-Output '=== 结论：app.js 不存在时启动失败 → exe 仍依赖源码目录，需要修复 ==='
  }
} finally {
  if ($proc -and -not $proc.HasExited) { & taskkill /PID $proc.Id /T /F 2>&1 | Out-Null }
  $env:APPDATA = $oldAppData
  Start-Sleep -Milliseconds 400
  if ($renamed -and (Test-Path $hidden)) {
    Rename-Item -LiteralPath $hidden -NewName 'app.js' -Force
    Write-Output '[收尾] app.js 已恢复'
  }
  Remove-Item -Recurse -Force $runDir -ErrorAction SilentlyContinue
}
