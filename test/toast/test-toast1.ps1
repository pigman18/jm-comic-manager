# Method 1: NotifyIcon STA + DoEvents (legacy balloon tip)
$title = '✅ 下载完成'
$msg = 'test comic name'

Add-Type -AssemblyName System.Windows.Forms
$n = New-Object System.Windows.Forms.NotifyIcon
$n.Icon = [System.Drawing.Icon]::ExtractAssociatedIcon((Get-Process -Id $pid).MainModule.FileName)
$n.BalloonTipTitle = $title
$n.BalloonTipText = $msg
$n.Visible = $true
$n.ShowBalloonTip(5000)
$sw = [System.Diagnostics.Stopwatch]::StartNew()
while ($sw.ElapsedMilliseconds -lt 5000) {
    [System.Windows.Forms.Application]::DoEvents()
    Start-Sleep -Milliseconds 100
}
$n.Dispose()
Write-Output "done"
