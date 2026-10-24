'use strict';

/**
 * 本地库状态路由
 *   POST /api/comics/:num/read     标记已读
 *   POST /api/reads/check          批量查询已读
 *   POST /api/comics/:num/ban      切换屏蔽
 *   POST /api/bans/check           批量查询屏蔽
 *   GET  /api/bans                 屏蔽列表
 *   POST /api/comics/:num/star     切换特别关注
 *   POST /api/stars/check          批量查询关注
 *   GET  /api/stars                关注列表
 *   GET  /api/comics/:albumNum/zip-file/:zipKey   读取 ZIP
 *   POST /api/comics/:num/open-viewer             调用外部阅读器
 */
const fs = require('node:fs');
const path = require('node:path');
const {exec, spawn} = require('node:child_process');
const {isNotEmptySync} = require('../../util/file');

module.exports = function registerLibraryRoutes(app, ctx) {
    const {api, config, manifest, store, wrapHandler} = ctx;

    // ── 已读 ───────────────────────────────────────────────────
    app.post(`${api}/comics/:num/read`, wrapHandler(async (req, res) => {
        const comicId = Math.floor(Number(req.params.num));
        const episodeId = req.body.episodeId != null ? Math.floor(Number(req.body.episodeId)) : comicId;
        if (!Number.isFinite(episodeId)) {
            res.json({ok: false, message: '无效的 episodeId'});
            return;
        }
        await store.comicRead.saveRead(episodeId);
        res.json({ok: true});
    }));

    app.post(`${api}/reads/check`, wrapHandler(async (req, res) => {
        const ids = req.body.ids;
        if (!Array.isArray(ids)) {
            res.json({ok: false, message: 'ids 必须是数组'});
            return;
        }
        const readIds = await store.comicRead.checkReads(
            ids.map((id) => Math.floor(Number(id))).filter(Number.isFinite)
        );
        res.json({ok: true, readIds});
    }));

    // ── 屏蔽 ───────────────────────────────────────────────────
    app.post(`${api}/comics/:num/ban`, wrapHandler(async (req, res) => {
        const num = Math.floor(Number(req.params.num));
        if (!Number.isFinite(num) || num < 1) {
            res.status(400).json({ok: false, message: '无效编码'});
            return;
        }
        const banned = await store.comicBan.toggleBan(num);
        res.json({ok: true, banned});
    }));

    app.post(`${api}/bans/check`, wrapHandler(async (req, res) => {
        const ids = req.body.ids;
        if (!Array.isArray(ids)) {
            res.json({ok: false, message: 'ids 必须是数组'});
            return;
        }
        const bannedIds = await store.comicBan.checkBans(
            ids.map((id) => Math.floor(Number(id))).filter(Number.isFinite)
        );
        res.json({ok: true, bannedIds});
    }));

    app.get(`${api}/bans`, wrapHandler(async (_req, res) => {
        const ids = await store.comicBan.listBans();
        res.json({ok: true, ids});
    }));

    // ── 特别关注 ───────────────────────────────────────────────
    app.post(`${api}/comics/:num/star`, wrapHandler(async (req, res) => {
        const num = Math.floor(Number(req.params.num));
        if (!Number.isFinite(num) || num < 1) {
            res.status(400).json({ok: false, message: '无效编码'});
            return;
        }
        const starred = await store.comicStar.toggleStar(num);
        res.json({ok: true, starred});
    }));

    app.post(`${api}/stars/check`, wrapHandler(async (req, res) => {
        const ids = req.body.ids;
        if (!Array.isArray(ids)) {
            res.json({ok: false, message: 'ids 必须是数组'});
            return;
        }
        const starredIds = await store.comicStar.checkStars(
            ids.map((id) => Math.floor(Number(id))).filter(Number.isFinite)
        );
        res.json({ok: true, starredIds});
    }));

    app.get(`${api}/stars`, wrapHandler(async (_req, res) => {
        const ids = await store.comicStar.listStars();
        res.json({ok: true, ids});
    }));

    // ── ZIP 读取 ───────────────────────────────────────────────
    app.get(`${api}/comics/:albumNum/zip-file/:zipKey`, (req, res) => {
        const n = Math.floor(Number(req.params.zipKey));
        const zipPath = path.join(config.dataDir, 'comic', `${n}.zip`);
        if (!isNotEmptySync(zipPath)) {
            res.status(404).json({ok: false, message: 'ZIP 不存在'});
            return;
        }
        res.setHeader('Content-Type', 'application/zip');
        fs.createReadStream(zipPath).pipe(res);
    });

    // ── 外部阅读器 ─────────────────────────────────────────────
    app.post(`${api}/comics/:num/open-viewer`, wrapHandler(async (req, res) => {
        const album = Math.floor(Number(req.params.num));
        const episodeNumber = Math.floor(Number(req.body.episodeNumber));
        const n = Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : album;
        const zipPath = path.join(path.resolve(manifest.workspace, config.dataDir), 'comic', `${n}.zip`);
        const exeRel = String(config.comicViewer || '').trim();
        if (!exeRel) {
            res.json({ok: true, useBrowser: true});
            return;
        }
        if (!isNotEmptySync(zipPath)) {
            res.json({ok: false, message: 'ZIP 不存在'});
            return;
        }
        const workspaceRoot = String(manifest.workspace || path.join(__dirname, '..'));
        const exeAbs = path.isAbsolute(exeRel) ? exeRel : path.join(workspaceRoot, exeRel);
        const cmdTpl = '${exe} ${path}';
        const q = (p) => {
            const s = String(p);
            if (process.platform === 'win32') {
                if (!/[ \t"&[\]{}|^`%]/.test(s)) return s;
                return `"${s.replace(/"/g, '""')}"`;
            }
            return `'${s.replace(/'/g, `'\\''`)}'`;
        };
        const cmdLine = cmdTpl.replace(/\$\{path\}/gi, q(zipPath)).replace(/\$\{exe\}/gi, q(exeAbs));
        const child = exec(cmdLine, {windowsHide: true, detached: true}, () => {});
        if (child && typeof child.unref === 'function') child.unref();
        res.json({ok: true, useBrowser: false});
    }));
};
