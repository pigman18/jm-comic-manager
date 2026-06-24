import { spawn } from 'node:child_process';

// Final approach: WinRT Toast via -EncodedCommand UTF-16LE Base64
const esc = s => s.replace(/`/g, '``').replace(/\$/g, '`$').replace(/"/g, '`"').replace(/\n/g, ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const title = esc('\u2705 \u4E0B\u8F7D\u5B8C\u6210');
const msg = esc('JM12345: test comic name from JS');

const ps = [
  "[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime] > $null",
  "[Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom.XmlDocument,ContentType=WindowsRuntime] > $null",
  '$x = [Windows.Data.Xml.Dom.XmlDocument]::new()',
  `$x.LoadXml("<toast><visual><binding template='ToastGeneric'><text id='1'>${title}</text><text id='2'>${msg}</text></binding></visual></toast>")`,
  '$t = [Windows.UI.Notifications.ToastNotification]::new($x)',
  "[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('Microsoft.Windows.Explorer').Show($t) | Out-Null"
].join('; ');

const b64 = Buffer.from(ps, 'utf16le').toString('base64');
console.log('Script:', ps.slice(0, 200) + '...');
console.log('B64:', b64.slice(0, 60) + '...');

const child = spawn('powershell', ['-NoProfile', '-EncodedCommand', b64], { stdio: 'inherit', windowsHide: true });
child.on('exit', code => console.log('exit code:', code));
