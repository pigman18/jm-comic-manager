import { create_window, expose, start } from 'ewvjs';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
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

// ── 3.1 注入本地加密（加密 config.json 中的 password/token/cookie）──
// 使用 AES-256-GCM + 机器/用户派生密钥；core 不依赖原生模块，能力由桌面端注入，
// 注入失败时 core 自动降级为明文，保证 CLI / 非 Windows 环境可用。
try {
    const { createLocalCodec } = await import('./src/secret-codec.js');
    const codec = createLocalCodec();
    if (!codec) {
        console.warn('[desktop] 本地加密不可用，敏感配置将以明文保存');
    } else if (typeof bundle.setSecretCodec !== 'function') {
        console.warn('[desktop] bundle 未导出 setSecretCodec（core 产物过旧？），敏感配置将以明文保存');
    } else {
        const r = bundle.setSecretCodec(codec);
        // 此时 logger 可能尚未接管，用 stdout 确保日志可见
        process.stdout.write('[desktop] 敏感配置加密已启用: ' + JSON.stringify(r) + '\n');
    }
} catch (e) {
    console.warn('[desktop] 加密注入失败，敏感配置将以明文保存:', e && e.message ? e.message : String(e));
}

// ── 4. Utilities ──────────────────────────────────────────────
function configPath() { return path.join(appDataDir(), 'config.json'); }

function browseDir(defaultPath) {
    return new Promise((resolve) => {
        if (process.platform !== 'win32') { resolve(''); return; }
        const sel = defaultPath ? `$f.SelectedPath = '${String(defaultPath).replace(/'/g, "''")}'; ` : '';
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

    // 打包后 pkg 的 __dirname 指向虚拟快照，原生层（.NET）无法读取快照内文件，
    // 因此图标必须从 exe 同目录的真实文件读取（安装包会把 icon.ico 放到安装目录）。
    const iconIco = typeof process.pkg !== 'undefined'
        ? path.join(path.dirname(process.execPath), 'icon.ico')
        : path.join(__dirname, 'icon.ico');

    let mainWin = null;

    /**
     * 窗口直接加载本地服务的 SPA。
     * 首次启动由 SPA 的 /setup 路由承接（配置通过 /api/config 读写），
     * 桌面壳不再承载任何配置 UI。
     */
    function resolveStartUrl() {
        if (isDev) {
            // 开发模式：Vite 直连（页面内通过 /api 代理到本地服务）
            return 'http://localhost:5173/index.html';
        }
        const home = bundle?.state?.server?.homeUrl;
        if (!home) throw new Error('本地服务未启动，无法获取页面地址');
        return home;
    }

    /**
     * 退出应用：先停本地服务，再结束进程。
     * 已移除托盘，因此关闭窗口 == 退出应用。
     */
    let _quitting = false;
    async function quitApp(code = 0) {
        if (_quitting) return;
        _quitting = true;
        try { await bundle.stop(); } catch { /* ignore */ }
        process.exit(code);
    }

    async function createMainWindow() {
        const startUrl = resolveStartUrl();

        const mw = await create_window('JM漫画管理器', startUrl, {
            width: 1200, height: 800, min_width: 800, min_height: 600, icon: iconIco,
            // 关闭窗口即退出（无托盘），因此不需要二次确认弹窗
            confirm_close: false, debug: true,
            dark_mode: true
        });
        await mw.run();
        mw.setIcon(iconIco).catch(e => console.error('[desktop] setIcon failed:', e));
        mainWin = mw;
        // 关闭窗口即退出应用（无托盘，不再隐藏到后台）
        mw.on_close = () => { void quitApp(0); };
        mw.on_context_menu = () => {
            return [
                { label: '设置', click: () => mw.evaluate('window.__showSettingsModal()').catch(() => {}) },
                { label: '打开配置文件夹', click: () => mw.evaluate('window.ewvjs.api.openConfigDir()').catch(() => {}) },
                { label: '打开数据目录', click: () => mw.evaluate('window.ewvjs.api.openDataDir()').catch(() => {}) },
                { type: 'separator' },
                { label: '在浏览器中打开', click: () => mw.evaluate('window.ewvjs.api.openBrowser()').catch(() => {}) },
                { type: 'separator' },
                { label: '重启应用', click: () => restartApp() },
                { type: 'separator' },
                { label: '退出', click: () => { void quitApp(0); } },
            ];
        };
        return mw;
    }

    /** 只暴露"原生能力"，业务配置一律走 /api/config */
    function exposeNativeFns() {
        expose('browseDir', browseDir);
        expose('browseFile', browseFile);
        expose('refreshPage', () => {
            if (mainWin) mainWin.reload();
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
        expose('getConfigPath', () => configPath());
    }

    // 桌面端统一流程：先起本地服务，再用本地服务地址创建窗口。
    // 首次启动的配置由 SPA 的 /setup 页面完成，桌面壳无需分支。
    await bundle.start({}, {});
    console.log('[desktop] server:', bundle.state.server.homeUrl);

    exposeNativeFns();

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

    // 进程级退出兜底：确保本地服务被正确关闭，不留孤儿进程/端口占用
    process.on('SIGTERM', () => { void quitApp(0); });
    process.on('SIGINT', () => { void quitApp(0); });
    process.on('uncaughtException', (err) => {
        console.error('[desktop]', err);
        void quitApp(1);
    });

    start();
}

main().catch((e) => { console.error('[desktop]', e); process.exit(1); });

