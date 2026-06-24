# Method 3: WinRT Toast with custom AUMID (temporary shortcut)
$title = '✅ 下载完成'
$msg = 'test comic name'

$aumid = 'JMComicManager.TestToast'
$lnk = "$env:APPDATA\Microsoft\Windows\Start Menu\Programs\$aumid.lnk"
$wshell = New-Object -ComObject WScript.Shell
$s = $wshell.CreateShortcut($lnk)
$s.TargetPath = "$env:windir\system32\WindowsPowerShell\v1.0\powershell.exe"
$s.Save()

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName('text')
$textNodes.Item(0).AppendChild($template.CreateTextNode($title)) > $null
$textNodes.Item(1).AppendChild($template.CreateTextNode($msg)) > $null
$toast = New-Object Windows.UI.Notifications.ToastNotification $template
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier($aumid).Show($toast)

Start-Sleep 3
Remove-Item $lnk -Force
Write-Output "done"
