# Method 4: WinRT Toast with Explorer AUMID (no shortcut needed)
$title = '✅ 下载完成'
$msg = 'test comic name'

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
$template = [Windows.UI.Notifications.ToastNotificationManager]::GetTemplateContent([Windows.UI.Notifications.ToastTemplateType]::ToastText02)
$textNodes = $template.GetElementsByTagName('text')
$textNodes.Item(0).AppendChild($template.CreateTextNode($title)) > $null
$textNodes.Item(1).AppendChild($template.CreateTextNode($msg)) > $null
$toast = New-Object Windows.UI.Notifications.ToastNotification $template
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Microsoft.Windows.Explorer').Show($toast)
Write-Output "done"
