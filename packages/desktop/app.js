import { create_window, expose, start } from 'ewvjs';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { spawn, exec } from 'child_process';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
import { createLogger, setDevToolsEval, setupConsole } from './src/logger.js';
// 注意：这里必须是【静态 import】。esbuild 打 bundle 时按静态依赖图收文件，
// 动态 import 的模块（旧写法 await import('./src/secret-codec.js')）不会被收集，
// 打包后运行时会 ERR_MODULE_NOT_FOUND。
import { createLocalCodec } from './src/secret-codec.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

/**
 * 运行时资源根目录。
 *
 * 打包后（pkg）__dirname 指向只读虚拟快照，而 runtime/、native/、icon.ico
 * 是由安装包放到 exe 旁边的真实文件，必须按 exe 所在目录取；
 * 开发态则用源码目录。
 */
const RUNTIME_ROOT = typeof process.pkg !== 'undefined'
    ? path.dirname(process.execPath)
    : __dirname;

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
// runtime/jm.core.all.cjs 是 pkg assets（打进快照）也是安装包里的真实文件。
// 优先从 exe 同目录加载（安装包布局），回退到快照内（assets 命中的情况）。
let bundle;
try {
    bundle = require(path.join(RUNTIME_ROOT, 'runtime', 'jm.core.all.cjs'));
} catch (e1) {
    try {
        bundle = require('./runtime/jm.core.all.cjs');
    } catch (e2) {
        process.stdout.write('[FATAL] bundle require failed: ' + String(e2) + '\n');
        process.exit(1);
    }
}

// ── 3.1 注入本地加密（加密 config.json 中的 password/token/cookie）──
// 使用 AES-256-GCM + 机器/用户派生密钥；core 不依赖原生模块，能力由桌面端注入，
// 注入失败时 core 自动降级为明文，保证 CLI / 非 Windows 环境可用。
try {
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
    if (_cfg.debug) {
        console.log('[con] jm-desktop starting, log:', path.join(appDataDir(), 'jm-desktop.log'));
    }

    // 打包后 pkg 的 __dirname 指向虚拟快照，原生层（.NET）无法读取快照内文件，
    // 因此图标必须从 exe 同目录的真实文件读取（安装包会把 icon.ico 放到安装目录）。
    const iconIco = path.join(RUNTIME_ROOT, 'icon.ico');

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
     * 无托盘，关闭窗口（经确认）即退出应用。
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
            // 关闭窗口时弹出「确认退出」，用户确认后才关闭
            confirm_close: true, debug: true,
            dark_mode: true
        });
        await mw.run();
        mw.setIcon(iconIco).catch(e => console.error('[desktop] setIcon failed:', e));
        mainWin = mw;
        // 用户确认关闭后触发：停服务并退出进程
        mw.on_close = () => {
            process.stdout.write('[desktop] on_close 触发，准备退出\n');
            void quitApp(0);
        };
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
    // 注意：窗口一旦关闭，ewvjs 的 evaluate 会走 console.warn('Cannot call evaluate: Window is closed')，
    // 而这条 warn 又会经 tee → 本转发器 → 再 evaluate，形成同步死循环刷日志。
    // 因此：1) _hostLogBusy 防重入；2) 失败一次即摘掉转发器（窗口已关，无需再转发）。
    let _hostLogBusy = false;
    setDevToolsEval((msg) => {
        if (!mainWin || _quitting || _hostLogBusy) return;
        // 前端回声重复调用，忽略掉即可
        if (msg.startsWith('WebView Console')) {
            return;
        }
        _hostLogBusy = true;
        mainWin.evaluate(`
            window?.__hostLog(${JSON.stringify(msg)})
        `).catch(() => { setDevToolsEval(null); })
            .finally(() => { _hostLogBusy = false; });
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

