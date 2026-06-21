'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');

let bundle;
try {
  bundle = require('../runtime/jm.core.all.js');
} catch (e) {
  console.error('[desktop] failed to load runtime/jm.core.all.js:', e.message);
  process.exit(1);
}

const PKG_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PKG_DIR, '..', '..');

function appDataDir() {
  const app = 'JmComicManager';
  if (process.platform === 'win32')
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), app);
  return path.join(os.homedir(), '.config', app);
}
function configPath() { return path.join(appDataDir(), 'config.json'); }
function hasConfig() { return fs.existsSync(configPath()); }
function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf-8')); } catch { return {}; }
}
function writeConfig(cfg) {
  const cur = readConfig();
  for (const [k, v] of Object.entries(cfg)) {
    if (v === undefined || v === null) delete cur[k];
    else cur[k] = v;
  }
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(cur, null, 2));
}

function createTray(binPath, iconPath, handlers) {
  const proc = spawn(binPath, ['--tooltip', 'JM Comic Manager'], {
    stdio: ['pipe', 'pipe', 'inherit'], windowsHide: true,
  });
  let buf = '';
  proc.stdout.on('data', (chunk) => {
    buf += chunk.toString();
    const lines = buf.split('\n');
    buf = lines.pop() || '';
    for (const line of lines) {
      const m = line.trim();
      if (!m) continue;
      try {
        const msg = JSON.parse(m);
        switch (msg.method) {
          case 'ready': if (iconPath) setTrayIcon(proc, iconPath); handlers.onReady?.(); break;
          case 'menuRequested': sendTray(proc, { method: 'setMenu', params: { items: handlers.onMenuRequested?.() || [] } }); break;
          case 'clicked': handlers.onClicked?.(msg.params.id); break;
        }
      } catch { }
    }
  });
  proc.on('error', (e) => console.error('[tray]', e.message));
  proc.on('exit', (c) => handlers.onExit?.(c));
  return proc;
}
function sendTray(proc, msg) { if (proc && proc.stdin.writable) proc.stdin.write(JSON.stringify(msg) + '\n'); }
function setTrayIcon(proc, iconPath) { try { sendTray(proc, { method: 'setIcon', params: { base64: fs.readFileSync(iconPath).toString('base64') } }); } catch {} }
function quitTray(proc) { try { proc.stdin.end(); } catch {} setTimeout(() => { try { proc.kill(); } catch {} }, 500); }

function browseDir() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') { resolve(''); return; }
    exec('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.ShowDialog() | Out-Null; Write-Output $f.SelectedPath"',
      { windowsHide: true, timeout: 30000 }, (err, stdout) => resolve((stdout || '').trim()));
  });
}
function browseFile() {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') { resolve(''); return; }
    exec('powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.ShowDialog() | Out-Null; Write-Output $f.FileName"',
      { windowsHide: true, timeout: 30000 }, (err, stdout) => resolve((stdout || '').trim()));
  });
}

function restartApp() {
  const child = spawn(process.execPath, process.argv.slice(1), {
    detached: true, stdio: 'inherit', windowsHide: true,
  });
  child.unref();
  process.exit(0);
}

// --- Main ---
async function main() {
  const { create_window, expose, start } = require('ewvjs');
  const iconIco = path.join(REPO_ROOT, 'resources', 'icon.ico');
  const configHtml = path.join(PKG_DIR, 'src', 'config-window.html');
  const trayBin = path.join(REPO_ROOT, 'node_modules', '@trayjs', 'win32-x64', 'bin', 'tray.exe');

  // State
  let mainWin = null;
  let mainWinAlive = false;
  let trayRef = null;
  let _configSavedCb = null;

  // Helpers
  async function createMainWindow(homeUrl) {
    const mw = await create_window('JM Comic Manager', homeUrl, {
      width: 1200, height: 800, min_width: 800, min_height: 600, icon: iconIco,
    });
    await mw.run();
    mainWin = mw;
    mainWinAlive = true;
    mw.on_close = () => { mainWinAlive = false; };
    return mw;
  }

  function setupTray(mw) {
    const tr = createTray(trayBin, iconIco, {
      onMenuRequested: () => [
        { id: 'toggle', title: mainWinAlive ? '隐藏主界面' : '显示主界面' },
        { id: 'config', title: '设置' },
        { id: 'sep', separator: true },
        { id: 'quit', title: '退出' },
      ],
      onClicked: async (id) => {
        if (id === 'toggle') {
          if (mainWinAlive) { await mw.hide(); mainWinAlive = false; }
          else { await mw.show(); mainWinAlive = true; }
        } else if (id === 'config') {
          if (mw) await mw.hide();
          const cw = await create_window('JM Comic Manager - 设置', configHtml, {
            width: 640, height: 560, resizable: false, icon: iconIco, on_top: true,
          });
          await cw.run();
          _configSavedCb = async () => {
            await cw.close();
            if (tr) quitTray(tr);
            await bundle.stop();
            restartApp();
          };
          await cw.show();
        } else if (id === 'quit') {
          if (tr) quitTray(tr);
          if (mw) await mw.close();
          await bundle.stop();
          process.exit(0);
        }
      },
      onExit: () => { trayRef = null; },
    });
    trayRef = tr;
    process.on('exit', () => { if (tr) quitTray(tr); });
    process.on('SIGTERM', () => { if (tr) quitTray(tr); process.exit(0); });
    process.on('SIGINT', () => { if (tr) quitTray(tr); process.exit(0); });
  }

  // Expose shared functions (with placeholder, overridden per-mode)
  expose('loadConfig', () => ({}));
  expose('saveConfig', (cfg) => { writeConfig(cfg); return { ok: true }; });
  expose('browseDir', browseDir);
  expose('browseFile', browseFile);
  expose('configSaved', () => { if (typeof _configSavedCb === 'function') _configSavedCb(); });
  expose('configExited', () => {});

  if (!hasConfig()) {
    // ====== FIRST RUN: only config window, server starts after save ======
    console.log('[desktop] first-run config');
    // loadConfig returns empty (no file yet)
    expose('loadConfig', () => ({}));

    const cw = await create_window('JM Comic Manager - 初始配置', configHtml, {
      width: 640, height: 560, resizable: false, icon: iconIco,
    });
    await cw.run();

    let _done = false;
    _configSavedCb = async () => {
      if (_done) return;
      _done = true;
      await cw.close();
      await bundle.start({}, {});
      console.log('[desktop] server:', bundle.state.server.homeUrl);
      await createMainWindow(bundle.state.server.homeUrl);
      setupTray(mainWin);
    };
    expose('configExited', async () => {
      await cw.close();
      process.exit(0);
    });

    await cw.show();
    await start();

  } else {
    // ====== NORMAL: server first, then window + tray ======
    await bundle.start({}, {});
    console.log('[desktop] server:', bundle.state.server.homeUrl);
    expose('loadConfig', () => readConfig());
    await createMainWindow(bundle.state.server.homeUrl);
    setupTray(mainWin);
    await start();
  }
}

main().catch((e) => { console.error('[desktop]', e); process.exit(1); });
