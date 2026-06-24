'use strict'

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');

const TMP = () => path.join(os.tmpdir(), 'jm-comic-manager');
const AUMID = 'JMComicManager';

function saveB64(base64, filename) {
  if (!base64) return null;
  const isDu = base64.startsWith('data:');
  const m = isDu ? base64.match(/^data:image\/(\w+);base64,(.+)$/) : null;
  const buf = m ? Buffer.from(m[2], 'base64') : Buffer.from(base64, 'base64');
  let fn = filename;
  if (!fn.includes('.')) {
    const ext = m ? ((m[1] === 'jpeg' || m[1] === 'ico') ? m[1] : 'jpg') : 'dat';
    fn = `${fn}.${ext}`;
  }
  const fp = path.join(TMP(), fn);
  if (!fs.existsSync(TMP())) fs.mkdirSync(TMP(), { recursive: true });
  try { fs.writeFileSync(fp, buf); return fp; } catch { return null; }
}

function ensureAumid(icoPath) {
  try {
    const lnkDir = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs');
    const lnkPath = path.join(lnkDir, `${AUMID}.lnk`);
    if (!fs.existsSync(lnkPath)) {
      if (!fs.existsSync(lnkDir)) fs.mkdirSync(lnkDir, { recursive: true });
      const escLnk = s => s.replace(/'/g, "''");
      const ps = `$ws=New-Object -ComObject WScript.Shell;$s=$ws.CreateShortcut('${escLnk(lnkPath)}');$s.TargetPath='powershell.exe';$s.IconLocation='${escLnk(icoPath)},0';$s.Save()`;
      cp.spawnSync('powershell', ['-NoProfile', '-Command', ps], { timeout: 5000, windowsHide: true, stdio: 'ignore' });
    }
    return AUMID;
  } catch { return 'Microsoft.Windows.Explorer'; }
}

/**
 * @param {string} title
 * @param {string} message
 * @param {string} [iconB64] - base64 of app icon (.ico)
 * @param {string} [imageB64] - base64 of cover image (png/jpg)
 */
function toast(title, message, iconB64, imageB64) {
  if (process.platform !== 'win32') return;
  const aumid = iconB64 ? ensureAumid(saveB64(iconB64, 'app-icon.ico') || '') : 'Microsoft.Windows.Explorer';
  const imgPath = saveB64(imageB64 || iconB64, 'toast-img');
  const esc = s => s.replace(/`/g, '``').replace(/\$/g, '`$').replace(/"/g, '`"').replace(/\n/g, ' ').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const imgXml = imgPath ? `<image id='1' src='${esc(imgPath)}'/>` : '';
  const ps = [
    "[Windows.UI.Notifications.ToastNotificationManager,Windows.UI.Notifications,ContentType=WindowsRuntime] > $null",
    "[Windows.Data.Xml.Dom.XmlDocument,Windows.Data.Xml.Dom.XmlDocument,ContentType=WindowsRuntime] > $null",
    '$x = [Windows.Data.Xml.Dom.XmlDocument]::new()',
    `$x.LoadXml("<toast><visual><binding template='ToastGeneric'><text id='1'>${esc(title)}</text><text id='2'>${esc(message)}</text>${imgXml}</binding></visual></toast>")`,
    '$t = [Windows.UI.Notifications.ToastNotification]::new($x)',
    `[Windows.UI.Notifications.ToastNotificationManager]::CreateToastNotifier('${aumid}').Show($t) | Out-Null`
  ].join('; ');
  const b64 = Buffer.from(ps, 'utf16le').toString('base64');
  cp.spawn('powershell', ['-NoProfile', '-EncodedCommand', b64], { windowsHide: true, stdio: 'ignore' }).unref();
}

module.exports = { toast };
