# Method 5: WinRT Toast + Explorer AUMID + ToastGeneric template (has icons)
$title = '✅ 下载完成'
$msg = 'test comic name'

[Windows.UI.Notifications.ToastNotificationManager, Windows.UI.Notifications, ContentType = WindowsRuntime] > $null
[Windows.Data.Xml.Dom.XmlDocument, Windows.Data.Xml.Dom.XmlDocument, ContentType = WindowsRuntime] > $null
$x = [Windows.Data.Xml.Dom.XmlDocument]::new()
$x.LoadXml("<toast><visual><binding template='ToastGeneric'><text id='1'>$title</text><text id='2'>$msg</text></binding></visual></toast>")
$t = [Windows.UI.Notifications.ToastNotification]::new($x)
[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Microsoft.Windows.Explorer').Show($t) | Out-Null
Write-Output "done"
