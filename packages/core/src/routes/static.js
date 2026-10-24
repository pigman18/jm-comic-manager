'use strict';

/**
 * 静态资源与文件代理路由
 *   GET  /*                     前端静态资源（内嵌 web-embedded 优先，磁盘兜底）
 *   GET  /file/*                本地缓存文件；缺失时按 originUrl 拉取并落盘
 */
const fs = require('node:fs');
const path = require('node:path');
const express = require('express');
const {isNotEmptySync} = require('../../util/file');
const {getMime} = require('../../util/http');
const {createFileHostGuard} = require('../security/file-host-guard');

/** 前端静态资源（内嵌优先，磁盘兜底） */
function registerWebStatic(app, ctx) {
    const {workspace, hp, fileUri, getWebEmbedded, setStaticMounted} = ctx;

    const webEmbedded = getWebEmbedded();
    const emb = webEmbedded && typeof webEmbedded === 'object' && Object.keys(webEmbedded).length > 0;

    /** /file 由文件代理处理，不能被 SPA 兜底吞掉 */
    const isReserved = (p) => p.startsWith('/api/') || p === fileUri || p.startsWith(`${fileUri}/`);

    if (emb) {
        setStaticMounted(true);
        app.use((req, res, next) => {
            // API 与 /file 直接跳过
            if (isReserved(req.path)) {
                return next();
            }
            if (req.method !== 'GET' && req.method !== 'HEAD') return next();

            let p = decodeURIComponent(req.path.replace(/^\/+/, '')) || 'index.html';
            if (p.endsWith('/')) p += 'index.html';

            let b64 = webEmbedded[p];
            // SPA fallback：仅对"看起来是前端路由"的路径回退到 index.html，
            // 不能对 /file 这类有专门处理器的前缀生效
            if (!b64 && !path.extname(p)) b64 = webEmbedded['index.html'];
            if (!b64) return next();

            res.setHeader('Content-Type', getMime(p));
            res.send(Buffer.from(b64, 'base64')).end();
        });
        return;
    }

    // 兜底：使用磁盘 web/dist（兼容 monorepo 和 flat 结构）
    setStaticMounted(true);
    const webDist = fs.existsSync(path.join(workspace, 'packages', 'web', 'dist'))
        ? path.join(workspace, 'packages', 'web', 'dist')
        : path.join(workspace, 'web', 'dist');
    const serveStatic = express.static(webDist);
    // /file 交给文件代理，不让 express.static 先吃掉
    app.use((req, res, next) => (isReserved(req.path) ? next() : serveStatic(req, res, next)));
    app.get(hp, (_req, res) => {
        res.status(503).type('text/plain; charset=utf-8').send(
            'JM 前端未安装：请用 npm run build:bundles 重新发布，或从镜像重新下载。'
        ).end();
    });
}

/** /file 本地缓存 + 远端拉取兜底 */
function registerFileProxy(app, ctx) {
    const {config, crawler, fileUri, fileQueue} = ctx;

    // 域名白名单：仅允许已知站点域名，防止被当作 SSRF 跳板
    const checkHost = createFileHostGuard(config);

    app.use(fileUri, express.static(path.resolve(`${config.dataDir}/file`), {
        maxAge: '30d',
        etag: false,
        lastModified: false,
        fallthrough: true, // 必须
    }));

    app.use(fileUri, (req, res) => {
        let originUrl = req.query.originUrl;
        if (!originUrl) {
            const rel = req.path.replace(/^\/+/, '');
            originUrl = `https://${rel}`;
        }
        if (!originUrl.startsWith('http')) {
            originUrl = `https:${originUrl}`;
        }

        // 白名单校验：不通过直接 403，不发起任何网络请求
        const verdict = checkHost(originUrl);
        if (!verdict.ok) {
            console.warn('[server] /file 拒绝:', verdict.reason, originUrl);
            res.status(403).json({ok: false, message: verdict.reason});
            return;
        }

        void fileQueue.add(async () => {
            try {
                const abs = await crawler.fetchRemoteFile(originUrl);
                if (!abs || !fs.existsSync(abs) || !isNotEmptySync(abs)) {
                    res.status(404).end();
                    return;
                }
                res.setHeader('Content-Type', getMime(abs) || 'application/octet-stream');
                res.setHeader('Cache-Control', 'public, max-age=86400');
                fs.createReadStream(abs).pipe(res);
            } catch (err) {
                console.error('[server]', err);
                if (!res.headersSent) res.status(500).end();
            }
        });
    });
}

module.exports = {registerWebStatic, registerFileProxy};
