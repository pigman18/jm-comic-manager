'use strict';

const fs = require('node:fs');
const path = require('node:path');
const PQueue = require('p-queue').default;
const express = require('express');
const expressWs = require('express-ws');
const compression = require('compression');

const {isNotEmptySync} = require('../util/file');
const {cdn2OriginUrl, url2DataPath} = require('../util/http');
const {wrapHandler, fmtDate, createToFileUrl, createRewriteComicMediaUrls} = require('./routes/context');

/** 构建时由 webpack 替换为 dist/bundles/jm.bundle/web-embedded.json；缺失或非对象时走磁盘 web/dist */
const webEmbedded = (() => {
    try {
        return require('./web-embedded.json');
    } catch {
        return {};
    }
})();

/**
 * JM 模块 HTTP 服务：静态页、/file 缓存、REST API、下载进度 WebSocket
 *
 * 本文件只负责「装配」：创建 app、挂载中间件、把依赖打包成 context 交给各 routes/*。
 * 具体路由实现在 ./routes/ 下按领域拆分。
 *
 * @param manifest      JM 模块应用配置（manifest.json）
 * @param ctx           宿主上下文
 * @param message     JM 模块消息分发器
 * @param config      用户配置（config.json）
 * @param store       数据库访问
 * @param crawler     爬虫与下载队列
 * @param taskManager 任务管理器
 */
function createServer(manifest, ctx, message, config, store, crawler, taskManager) {
    const {workspace} = manifest;
    let _server;
    const FILE_URI = '/file';

    const fileQueue = new PQueue({concurrency: 10});
    /** @type {Set<import('ws')>} */
    const progressClients = new Set();
    message.dispatchers.serverState = () => {
        // 旧的下载进度同步已移除 — taskManager 承担全部任务管理
    };

    /** 浏览器打开首页时的 origin，用于把站点图片 URL 改写为同源代理 */
    let serverOrigin = '';
    let staticMounted = false;
    const port = Number(config.port) || 47310;

    /**
     * 监听地址。
     *
     * 默认 127.0.0.1：本应用是单机桌面工具，服务不应暴露到局域网。
     * 需要手机/其他设备访问时，可在 config.json 显式设置 "listenHost": "0.0.0.0"。
     */
    const host = (() => {
        const v = String(config.listenHost || '').trim();
        return v || '127.0.0.1';
    })();
    /** 浏览器/窗口访问用的主机名：通配地址要换成本机回环 */
    const listenHost = (host === '0.0.0.0' || host === '::') ? '127.0.0.1' : host;
    const hp = '/index.html';
    serverOrigin = `http://${listenHost}:${port}`;
    let homeUrl = `${serverOrigin}${hp.startsWith('/') ? hp : `/${hp}`}`;

    // ── 共享工具（依赖 config）────────────────────────────────
    const toFileUrl = createToFileUrl({config, fileUri: FILE_URI, cdn2OriginUrl, url2DataPath});
    const rewriteComicMediaUrls = createRewriteComicMediaUrls({config, toFileUrl});

    // ── 进度推送（带 200ms 节流 + 终态清理）───────────────────
    let _lastProgressSend = 0;
    let _pendingProgress = null;
    let _progressTimer = null;

    function flushProgress() {
        if (!_pendingProgress) return;
        const p = _pendingProgress;
        _pendingProgress = null;
        _lastProgressSend = Date.now();
        const s = JSON.stringify(p);
        for (const ws of progressClients) {
            try { ws.send(s); } catch { /* */ }
        }
    }

    function sendMessage(payload) {
        if (payload && typeof payload === 'object' && payload.type === 'progress') {
            const now = Date.now();
            if (now - _lastProgressSend < 200) {
                _pendingProgress = payload;
                if (!_progressTimer) {
                    _progressTimer = setTimeout(() => {
                        _progressTimer = null;
                        flushProgress();
                    }, 200 - (now - _lastProgressSend));
                }
                return;
            }
            _lastProgressSend = now;
            _pendingProgress = null;
        }

        // 非 progress：清掉缓存的 progress，避免覆盖终态
        if (!(payload?.type === 'progress')) {
            if (_progressTimer) { clearTimeout(_progressTimer); _progressTimer = null; }
            _pendingProgress = null;
        }

        const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
        for (const ws of progressClients) {
            try { ws.send(s); } catch { /* */ }
        }
    }

    /** 为详情接口组装各分册 ZIP 的存在性与下载进度 */
    async function buildZipStatusMap(comicJson) {
        const z = {};
        const eps = Array.isArray(comicJson.series) && comicJson.series.length ? comicJson.series : null;
        const nums = eps ? eps.map((e) => Number(e.id)).filter((n) => Number.isFinite(n)) : [];
        const comicDir = path.join(config.dataDir, 'comic');
        for (const n of nums) {
            z[String(n)] = {
                exists: isNotEmptySync(path.join(comicDir, `${n}.zip`)),
                download: taskManager ? taskManager.getZipDownloadStatus(n) : null,
            };
        }
        if (!eps) {
            z[String(comicJson.id)] = {
                exists: isNotEmptySync(path.join(comicDir, `${comicJson.id}.zip`)),
                download: taskManager ? taskManager.getZipDownloadStatus(Number(comicJson.id)) : null,
            };
        }
        return z;
    }

    /** 供各路由使用的上下文 */
    function buildContext(api) {
        return {
            manifest, config, store, crawler, taskManager, message,
            api,
            fileUri: FILE_URI,
            hp,
            workspace,
            fileQueue,
            progressClients,
            wrapHandler,
            fmtDate,
            toFileUrl,
            rewriteComicMediaUrls,
            sendMessage,
            buildZipStatusMap,
            getWebEmbedded: () => webEmbedded,
            setStaticMounted: (v) => { staticMounted = v; },
        };
    }

    async function start() {
        const app = express();
        expressWs(app);
        const morgan = require('morgan');
        morgan.token('time', () => new Date().toISOString());
        morgan.token('body', (req) => JSON.stringify(req.body));
        morgan.token('pid', () => process.pid);
        app.use(
            morgan(
                ':time [:pid] :method :url :status :res[content-length] - :response-time ms'
            )
        );
        app.use(compression());
        app.use(express.json({limit: '2mb'}));

        const api = '/api';
        const context = buildContext(api);

        // ── 挂载路由（顺序敏感：静态在前，API 在后）────────────
        const {registerWebStatic, registerFileProxy} = require('./routes/static');
        registerWebStatic(app, context);
        registerFileProxy(app, context);

        require('./routes/ws')(app, context);
        require('./routes/settings')(app, context);
        require('./routes/tags')(app, context);
        require('./routes/comics')(app, context);
        require('./routes/rank')(app, context);
        require('./routes/favorites')(app, context);
        require('./routes/account')(app, context);
        require('./routes/tasks')(app, context);
        require('./routes/library')(app, context);
        require('./routes/forum')(app, context);

        // 全局错误处理
        app.use((err, req, res, _next) => {
            console.error('[server]', err);
            res.status(500).json({ok: false, message: String(err.message || err)});
        });

        await new Promise((resolve, reject) => {
            _server = app.listen(port, host, () => {
                if (typeof ctx?.log === 'function') {
                    ctx.log({
                        text: `[jm.server] ${homeUrl} listen=${host}:${port} static=${staticMounted ? 'ok' : 'missing'}`,
                    });
                }
                console.log(`[jm.server] ${homeUrl} listen=${host}:${port} static=${staticMounted ? 'ok' : 'missing'}`);
                resolve({port, homeUrl, host});
            });
            _server.on('error', reject);
        });
        return {port, homeUrl: homeUrl, host};
    }

    async function stop() {
        if (_server) {
            _server.close();
            _server = null;
        }
        progressClients.clear();
    }

    return {
        start,
        stop,
        sendMessage,
        toFileUrl,
        homeUrl,
    };
}

module.exports = {
    createServer,
};
