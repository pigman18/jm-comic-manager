'use strict';

/**
 * 漫画相关路由
 *   GET  /api/comics                       本地列表（分页/筛选/排序）
 *   GET  /api/comics/:num                  本地详情
 *   POST /api/comics/:num/fetch-meta       拉取元数据
 *   POST /api/comics/:num/buy              金币购买
 *   GET  /api/search/comics                在线搜索
 *   GET  /api/search/hot-tags              热门标签
 *   GET  /api/search/random-recommend      随机推荐
 */
const path = require('node:path');
const {isNotEmptySync} = require('../../util/file');

module.exports = function registerComicsRoutes(app, ctx) {
    const {
        api, config, store, crawler, wrapHandler,
        rewriteComicMediaUrls, buildZipStatusMap, fmtDate,
    } = ctx;

    const comicDirOf = () => path.join(config.dataDir, 'comic');

    // ── 本地列表 ───────────────────────────────────────────────
    const sortMap = {
        id: 'id',
        name: 'name',
        total_views: 'total_views',
        likes: 'likes',
        addtime: 'addtime',
        create_time: 'create_time',
        update_time: 'update_time',
    };

    app.get(`${api}/comics`, wrapHandler(async (req, res) => {
        const qo = {
            name: String(req.query.title || req.query.name || '').trim(),
            author: String(req.query.author || '').trim(),
            id: String(req.query.number || req.query.id || '').trim(),
            tags: String(req.query.tags || '').trim(),
            works: String(req.query.works || '').trim(),
            actors: String(req.query.actors || '').trim(),
            kind: String(req.query.kind || '').trim(),
            banned: String(req.query.banned || '').trim(),
            starred: String(req.query.starred || '').trim(),
            sort: sortMap[String(req.query.sort || 'update_time')] || 'update_time',
            order: String(req.query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC',
            page: Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1),
            pageSize: Math.min(50, Math.max(1, parseInt(String(req.query.pageSize || '10'), 10) || 10)),
            availDir: req.query.available === 'true' ? comicDirOf() : null,
        };
        const {total, rows} = await store.comicMeta.page(qo);
        const comicDir = comicDirOf();
        const list = rows.map((row) => {
            const j = rewriteComicMediaUrls(store.dbRowToJson(row));
            j.canRead = isNotEmptySync(path.join(comicDir, `${j.id}.zip`));
            return j;
        });
        res.json({ok: true, list, total});
    }));

    // ── 拉取元数据 ─────────────────────────────────────────────
    app.post(`${api}/comics/:num/fetch-meta`, wrapHandler(async (req, res) => {
        const n = Math.floor(Number(req.params.num));
        const info = await crawler.comic.getMeta(n);
        if (!info) {
            res.json({ok: false, message: '无可用信息或 JM 编码无效'});
            return;
        }
        await store.comicMeta.saveOrUpdate(store.jsonRowToDb(info));
        const row = await store.comicMeta.get(n);
        const comic = row ? rewriteComicMediaUrls(store.dbRowToJson(row)) : null;
        if (!comic) {
            res.json({ok: false, message: '获取信息失败'});
            return;
        }
        const eps = Array.isArray(comic.series) && comic.series.length ? comic.series : [];
        const comicDir = comicDirOf();
        const allSeries = eps.map((e) => {
            const en = Number(e.id);
            return {
                id: String(e.id),
                name: String(e.name || ''),
                done: isNotEmptySync(path.join(comicDir, `${en}.zip`)),
            };
        });
        comic.series = allSeries;
        const singleDone = allSeries.length === 0 && isNotEmptySync(path.join(comicDir, `${n}.zip`));
        const allDone = (allSeries.length > 0 && allSeries.every((e) => e.done)) || singleDone;
        const zipStatus = {};
        for (const ep of allSeries) {
            zipStatus[String(ep.id)] = {exists: ep.done};
        }
        if (allSeries.length === 0) {
            zipStatus[String(n)] = {exists: singleDone};
        }
        res.json({ok: true, comic, zipStatus, allDone});
    }));

    // ── 金币购买 ───────────────────────────────────────────────
    app.post(`${api}/comics/:num/buy`, wrapHandler(async (req, res) => {
        const n = Math.floor(Number(req.params.num));
        const result = await crawler.comic.buyAlbum(n);
        let memberInfo = null;
        if (result?.data?.coin !== undefined) {
            memberInfo = config.memberInfo;
            if (memberInfo) {
                memberInfo.coin = result.data.coin;
                config.setValue('memberInfo', memberInfo);
            }
        } else {
            const loginResult = await crawler.account.login();
            memberInfo = loginResult?.memberInfo || null;
        }
        const info = await crawler.comic.getMeta(n);
        if (info) {
            await store.comicMeta.saveOrUpdate(store.jsonRowToDb(info));
        }
        const row = await store.comicMeta.get(n);
        const comic = row ? rewriteComicMediaUrls(store.dbRowToJson(row)) : null;
        res.json({ok: true, comic, memberInfo});
    }));

    // ── 本地详情 ───────────────────────────────────────────────
    app.get(`${api}/comics/:num`, wrapHandler(async (req, res) => {
        const n = Math.floor(Number(req.params.num));
        const row = await store.comicMeta.get(n);
        if (!row) {
            res.json({ok: false, message: '未找到漫画'});
            return;
        }
        const comic = rewriteComicMediaUrls(store.dbRowToJson(row));
        const eps = Array.isArray(comic.series) && comic.series.length ? comic.series : [];
        const comicDir = comicDirOf();
        comic.series = eps.map((e) => {
            const en = Number(e.id);
            return {
                id: String(e.id),
                name: String(e.name || ''),
                done: isNotEmptySync(path.join(comicDir, `${en}.zip`)),
            };
        });
        const zipStatus = await buildZipStatusMap(comic);
        res.json({ok: true, comic, zipStatus});
    }));

    // ── 在线搜索 ───────────────────────────────────────────────
    app.get(`${api}/search/comics`, wrapHandler(async (req, res) => {
        const keyword = String(req.query.keyword || '').trim();
        if (!keyword) {
            res.json({ok: false, message: '请输入搜索关键词'});
            return;
        }
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        const sort = String(req.query.sort || '');
        const result = await crawler.search.byKeyword(keyword, page, sort);
        const comicDir = comicDirOf();
        const list = await Promise.all((result.content || []).map(async (item) => {
            const id = Number(item.id);
            const dbRow = await store.comicMeta.get(id);
            const o = {
                ...item,
                id,
                name: String(item.name || ''),
                cover: String(item.image || ''),
                author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                description: String(item.description || ''),
                total_views: String(item.total_views ?? ''),
                likes: String(item.likes ?? ''),
                kind: String((item.category || {}).title || (item.category_sub || {}).title || ''),
                displayKindLabel: String((item.category_sub || {}).title || (item.category || {}).title || ''),
                updateDate: item.update_at ? fmtDate(item.update_at) : '',
                inStore: !!dbRow,
                canRead: isNotEmptySync(path.join(comicDir, `${id}.zip`)),
            };
            return rewriteComicMediaUrls(o);
        }));
        res.json({ok: true, list, total: result.total || 0, pages: result.pages || 1});
    }));

    app.get(`${api}/search/hot-tags`, wrapHandler(async (_req, res) => {
        const list = await crawler.search.hotTags();
        res.json({ok: true, list});
    }));

    app.get(`${api}/search/random-recommend`, wrapHandler(async (_req, res) => {
        const list = await crawler.search.randomRecommend();
        const comicDir = comicDirOf();
        const items = (list || []).map((item) => {
            const id = Number(item.id);
            const o = {
                id,
                name: String(item.name || ''),
                cover: String(item.image || ''),
                author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                description: String(item.description || ''),
                category: item.category || null,
                category_sub: item.category_sub || null,
                liked: !!item.liked,
                is_favorite: !!item.is_favorite,
                update_at: item.update_at || 0,
                inStore: isNotEmptySync(path.join(config.dataDir, 'info', `${id}.json`)),
                canRead: isNotEmptySync(path.join(comicDir, `${id}.zip`)),
            };
            return rewriteComicMediaUrls(o);
        });
        res.json({ok: true, list: items});
    }));
};
