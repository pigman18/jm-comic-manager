import { create_window, expose, start } from 'ewvjs';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createTray } from './src/tray.js';
import { createLogger, setDevToolsEval, setupConsole } from './src/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// ── 0. Config ──────────────────────────────────────────────────
function appDataDir() {
    const app = 'JmComicManager';
    if (process.platform === 'win32')
        return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), app);
    return path.join(os.homedir(), '.config', app);
}
function readConfig() {
    try { return JSON.parse(fs.readFileSync(path.join(appDataDir(), 'config.json'), 'utf-8')); } catch { return {}; }
}
const _cfg = readConfig();

// ── 1. Console setup ───────────────────────────────────────────
setupConsole(_cfg.debug);

// ── 2. Logger setup ────────────────────────────────────────────
const _logger = createLogger({ file: path.join(appDataDir(), 'jm-desktop.log') });

// ── 3. Bundle ─────────────────────────────────────────────────
let bundle;
try {
    bundle = require('./runtime/jm.core.all.cjs');
} catch (e) {
    process.stdout.write('[FATAL] bundle require failed: ' + String(e) + '\n');
    process.exit(1);
}

// ── 4. Utilities ──────────────────────────────────────────────
function configPath() { return path.join(appDataDir(), 'config.json'); }
function hasConfig() { return fs.existsSync(configPath()); }
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
        detached: true, stdio: 'ignore', windowsHide: true,
    });
    child.on('error', (e) => console.error('[desktop] restart spawn failed:', e));
    child.unref();
    setTimeout(() => process.exit(0), 200);
}

const isDev = process.argv.includes('--dev') || process.env.NODE_ENV === 'development';

async function main() {
    process.stdout.write('[TRACE] main() called\n');

    if (_cfg.debug) {
        console.log('[con] jm-desktop starting, log:', path.join(appDataDir(), 'jm-desktop.log'));
    }

    const iconIco = path.join(__dirname, 'icon.ico');

    let mainWin = null;
    let mainWinAlive = false;
    let trayRef = null;
    let _configSavedCb = null;

    async function createMainWindow() {
        const startUrl = isDev
            ? 'http://localhost:5173'
            : path.resolve(__dirname, 'dist/index.html');

        const mw = await create_window('JM漫画管理器', startUrl, {
            width: 1200, height: 800, min_width: 800, min_height: 600, icon: iconIco, confirm_close: true, debug: true,
            dark_mode: true
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
                { label: '隐藏到托盘', click: () => { mw.hide().catch(() => {}); mainWinAlive = false; if (trayRef) trayRef.setMenu(getTrayMenu()); } },
                { label: '设置', click: () => mw.evaluate('window.__showSettingsModal()').catch(() => {}) },
                { label: '打开配置文件夹', click: () => mw.evaluate('window.ewvjs.api.openConfigDir()').catch(() => {}) },
                { label: '打开数据目录', click: () => mw.evaluate('window.ewvjs.api.openDataDir()').catch(() => {}) },
                { type: 'separator' },
                { label: '在浏览器中打开', click: () => mw.evaluate('window.ewvjs.api.openBrowser()').catch(() => {}) },
                { type: 'separator' },
                { label: '重启应用', click: () => restartApp() },
                { type: 'separator' },
                { label: '退出', click: () => { if (trayRef) trayRef.close(); bundle.stop().catch(() => {}); process.exit(0); } },
            ];
        };
        return mw;
    }

    function getTrayMenu() { return [
        { id: 'toggle', title: mainWinAlive ? '隐藏到托盘' : '显示主窗口' },
        { separator: true },
        { id: 'restart', title: '重启应用' },
        { separator: true },
        { id: 'quit', title: '退出' },
    ]; }

    function setupTray(mw) {
        const tr = createTray({
            icon: iconIco,
            tooltip: 'JM漫画管理器',
            menu: getTrayMenu(),
            onClicked: async (id) => {
                if (id === 'toggle') {
                    if (mainWinAlive) { await mw.hide(); mainWinAlive = false; tr.setMenu(getTrayMenu()); }
                    else { await mw.show(); mw.focus(); mainWinAlive = true; tr.setMenu(getTrayMenu()); }
                } else if (id === 'restart') {
                    tr.close();
                    if (mw) await mw.close();
                    await bundle.stop();
                    restartApp();
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
        expose('restartApp', () => { restartApp(); });
        expose('getServerUrl', () => bundle?.state?.server?.homeUrl || '');
    }

    if (!hasConfig()) {
        console.log('[desktop] first-run config');
        expose('loadConfig', () => {
            try {
                const d = JSON.parse(fs.readFileSync(path.join(__dirname, 'runtime', 'config.json'), 'utf-8'));
                d.dataDir = path.join(appDataDir(), 'data');
                return d;
            } catch (e) { console.warn('[desktop] failed to read runtime config', e); return {}; }
        });

        await createMainWindow();
        if (_logger) _logger.reinstall();
        _configSavedCb = () => {
            const args = process.argv.slice(1);
            spawn(process.execPath, args, { detached: true, stdio: 'ignore' }).unref();
            if (trayRef) trayRef.close();
            process.exit(0);
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
        if (_logger) {
            _logger.reinstall();
            console.log('[desktop] logger reinstalled');
        }
        /* ---------- 始终输出日志到 DevTools ---------- */
        setDevToolsEval((msg) => {
            if (!mainWin) return;
            // 前端回声重复调用，忽略掉即可
            if (msg.startsWith('WebView Console')) {
                return;
            }
            mainWin.evaluate(`
                window?.__hostLog(${JSON.stringify(msg)})
            `).catch(() => {});
        });
        setupTray(mainWin);
        start();
    }
}

main().catch((e) => { console.error('[desktop]', e); process.exit(1); });
