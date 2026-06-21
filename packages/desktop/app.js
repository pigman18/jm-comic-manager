import { create_window, expose, start } from 'ewvjs';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createTray } from './src/tray.js';
import koffi from 'koffi';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

let bundle;
try {
  bundle = require('./runtime/jm.core.all.cjs');
} catch (e) {
  process.exit(1);
}

function setupLogging(cfg) {
  const logPath = path.join(appDataDir(), 'jm-desktop.log');
  try { fs.mkdirSync(path.dirname(logPath), { recursive: true }); } catch {}
  const logStream = fs.createWriteStream(logPath, { flags: 'a' });

  if (cfg?.debug) {
    try {
      const kernel32 = koffi.load('kernel32.dll');
      const allocConsole = kernel32.func('AllocConsole', 'bool', []);
      allocConsole();
    } catch (e) {
      // ignore - console may already exist (dev mode)
    }
  }

  const origLog = console.log.bind(console);
  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  console.log = (...args) => {
    logStream.write(`[LOG] ${new Date().toISOString()} ${args.join(' ')}\n`);
    origLog(...args);
  };
  console.warn = (...args) => {
    logStream.write(`[WRN] ${new Date().toISOString()} ${args.join(' ')}\n`);
    origWarn(...args);
  };
  console.error = (...args) => {
    logStream.write(`[ERR] ${new Date().toISOString()} ${args.join(' ')}\n`);
    origError(...args);
  };
}

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

function browseDir(defaultPath) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') { resolve(''); return; }
    const sel = defaultPath ? `$f.SelectedPath = '${defaultPath.replace(/'/g, "''")}'; ` : '';
    exec(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; ${sel}$f.ShowDialog() | Out-Null; Write-Output $f.SelectedPath"`,
      { windowsHide: true, timeout: 30000 }, (err, stdout) => resolve((stdout || '').trim()));
  });
}
function browseFile(defaultPath) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') { resolve(''); return; }
    let init = '';
    if (defaultPath) {
      try {
        const dir = path.dirname(defaultPath);
        const base = path.basename(defaultPath);
        init = `$f.InitialDirectory = '${dir.replace(/'/g, "''")}'; $f.FileName = '${base.replace(/'/g, "''")}'; `;
      } catch {}
    }
    exec(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; ${init}$f.ShowDialog() | Out-Null; Write-Output $f.FileName"`,
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

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

async function main() {
  const cfg = readConfig();
  setupLogging(cfg);

  const iconIco = path.join(__dirname, 'icon.ico');

  let mainWin = null;
  let mainWinAlive = false;
  let trayRef = null;
  let _configSavedCb = null;

  async function createMainWindow() {
    const startUrl = isDev
      ? 'http://localhost:5173'
      : path.resolve(__dirname, 'dist/index.html');

    const mw = await create_window('JM\u6F2B\u753B\u7BA1\u7406\u5668', startUrl, {
      width: 1200, height: 800, min_width: 800, min_height: 600, icon: iconIco, confirm_close: true, debug: cfg.debug,
    });
    await mw.run();
    mw.setIcon(iconIco).catch(e => console.error('[desktop] setIcon failed:', e));
    mainWin = mw;
    mainWinAlive = true;
    mw.on_close = () => {
      mainWinAlive = false;
      if (trayRef) trayRef.setMenu(getTrayMenu());
    };
    mw.on_context_menu = (params) => {
      return [
        { label: '设置', click: () => mw.evaluate('window.__showSettingsModal()').catch(() => {}) },
        { label: '打开配置文件夹', click: () => mw.evaluate('window.ewvjs.api.openConfigDir()').catch(() => {}) },
        { label: '打开数据目录', click: () => mw.evaluate('window.ewvjs.api.openDataDir()').catch(() => {}) },
        { label: '在浏览器中打开', click: () => mw.evaluate('window.ewvjs.api.openBrowser()').catch(() => {}) },
        { type: 'separator' },
        { label: '刷新', click: () => mw.evaluate('window.location.reload()').catch(() => {}) },
        { type: 'separator' },
        { label: '隐藏到托盘', click: () => { mw.hide().catch(() => {}); mainWinAlive = false; if (trayRef) trayRef.setMenu(getTrayMenu()); } },
        { type: 'separator' },
        { label: '退出', click: () => { if (trayRef) trayRef.close(); bundle.stop().catch(() => {}); process.exit(0); } },
      ];
    };
    return mw;
  }

  function getTrayMenu() { return [
    { id: 'toggle', title: mainWinAlive ? '隐藏到托盘' : '显示主窗口' },
    { separator: true },
    { id: 'quit', title: '退出' },
  ]; }

  function setupTray(mw) {
    const tr = createTray({
      icon: iconIco,
      tooltip: 'JM\u6F2B\u753B\u7BA1\u7406\u5668',
      menu: getTrayMenu(),
      onClicked: async (id) => {
        if (id === 'toggle') {
          if (mainWinAlive) { await mw.hide(); mainWinAlive = false; tr.setMenu(getTrayMenu()); }
          else { await mw.show(); mw.focus(); mainWinAlive = true; tr.setMenu(getTrayMenu()); }
        } else if (id === 'quit') {
          tr.close();
          if (mw) await mw.close();
          await bundle.stop();
          process.exit(0);
        }
      },
      onExit: () => { trayRef = null; },
    });
    trayRef = tr;
    process.on('exit', () => { if (tr) tr.close(); });
    process.on('SIGTERM', () => { if (tr) tr.close(); process.exit(0); });
    process.on('SIGINT', () => { if (tr) tr.close(); process.exit(0); });
  }

  expose('loadConfig', () => ({}));
  expose('saveConfig', (cfg) => { writeConfig(cfg); return { ok: true }; });
  expose('browseDir', browseDir);
  expose('browseFile', browseFile);
  expose('configSaved', () => { if (typeof _configSavedCb === 'function') _configSavedCb(); });
  expose('configExited', () => {});

  function exposeSidebarFns() {
    expose('refreshPage', () => {
      if (mainWin) mainWin.reload();
    });
    expose('hideToTray', async () => {
      if (!mainWin) return;
      await mainWin.hide();
      mainWinAlive = false;
      if (trayRef) trayRef.setMenu(getTrayMenu());
    });
    expose('openDataDir', () => {
      const cfg = readConfig();
      const dir = cfg.dataDir || appDataDir();
      if (process.platform === 'win32') exec(`explorer "${dir}"`);
    });
    expose('openConfigDir', () => {
      if (process.platform === 'win32') exec(`explorer "${appDataDir()}"`);
    });
    expose('openBrowser', () => {
      const url = bundle.state.server.homeUrl;
      if (process.platform === 'win32') exec(`start "" "${url}"`);
    });
    expose('openSettings', async () => {
      if (!mainWin) return;
      mainWin.evaluate('window.__showSettingsModal()').catch(() => {});
    });
    expose('getServerUrl', () => bundle?.state?.server?.homeUrl || '');
  }

  if (!hasConfig()) {
    console.log('[desktop] first-run config');
    expose('loadConfig', () => ({}));

    await createMainWindow();
    setupTray(mainWin);
    _configSavedCb = async () => {
      await bundle.start({}, {});
      console.log('[desktop] server:', bundle.state.server.homeUrl);
      expose('loadConfig', () => readConfig());
      exposeSidebarFns();
      mainWin.evaluate('window.__onServerReady()').catch(() => {});
    };
    expose('configExited', () => {
      if (trayRef) trayRef.close();
      process.exit(0);
    });
    start();

  } else {
    await bundle.start({}, {});
    console.log('[desktop] server:', bundle.state.server.homeUrl);
    expose('loadConfig', () => readConfig());
    exposeSidebarFns();
    await createMainWindow();
    setupTray(mainWin);
    start();
  }
}

main().catch((e) => { console.error('[desktop]', e); process.exit(1); });
