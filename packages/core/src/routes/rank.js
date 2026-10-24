'use strict';

/**
 * 排行榜 / 分类 / 连载 / 最新 / 每周必看 / 推广路由
 *   GET /api/week/info, /api/week/comics
 *   GET /api/serial/comics
 *   GET /api/latest/comics
 *   GET /api/category/info, /api/category/filter
 *   GET /api/promote, /api/promote/sections, /api/promote/list
 */
const path = require('node:path');
const {isNotEmptySync} = require('../../util/file');

module.exports = function registerRankRoutes(app, ctx) {
    const {api, config, store, crawler, wrapHandler, rewriteComicMediaUrls} = ctx;

    const comicDirOf = () => path.join(config.dataDir, 'comic');

    /** 批量补全 inStore / canRead */
    async function enrichStoreFlags(list) {
        const comicDir = comicDirOf();
        await Promise.all(list.map(async (o) => {
            const dbRow = await store.comicMeta.get(o.id);
            o.inStore = !!dbRow;
            o.canRead = isNotEmptySync(path.join(comicDir, `${o.id}.zip`));
        }));
    }

    // ── 每周必看 ───────────────────────────────────────────────
    app.get(`${api}/week/info`, wrapHandler(async (_req, res) => {
        const info = await crawler.rank.weekInfo();
        res.json({ok: true, categories: info?.categories || [], type: info?.type || []});
    }));

    app.get(`${api}/week/comics`, wrapHandler(async (req, res) => {
        const categoryId = String(req.query.categoryId || '');
        const typeId = req.query.typeId ? String(req.query.typeId) : null;
        if (!categoryId) {
            res.json({ok: false, message: '缺少期数参数'});
            return;
        }
        const result = await crawler.rank.weekly(categoryId, typeId);
        const list = (result?.list || []).map((item) => {
            const id = Number(item.id);
            const o = {
                ...item,
                id,
                name: String(item.name || ''),
                cover: String(item.image || ''),
                author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                total_views: String(item.total_views ?? ''),
                likes: String(item.likes ?? ''),
                inStore: false,
                canRead: false,
            };
            return rewriteComicMediaUrls(o);
        });
        await enrichStoreFlags(list);
        res.json({ok: true, list, total: result?.total || list.length});
    }));

    // ── 每日连载 ───────────────────────────────────────────────
    app.get(`${api}/serial/comics`, wrapHandler(async (req, res) => {
        const day = parseInt(req.query.day, 10) || 0;
        const page = parseInt(req.query.page, 10) || 1;
        const result = await crawler.rank.serialization(day, page);
        const list = (result?.list || []).map((item) => {
            const id = Number(item.aid || item.id);
            const o = {
                ...item,
                id,
                name: String(item.title || item.name || ''),
                cover: String(item.cover || item.image || ''),
                author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                total_views: String(item.views ?? ''),
                likes: String(item.likes ?? ''),
                inStore: false,
                canRead: false,
            };
            return rewriteComicMediaUrls(o);
        });
        await enrichStoreFlags(list);
        const hasMore = !result?.error;
        res.json({ok: true, list, hasMore});
    }));

    // ── 最新发布 ───────────────────────────────────────────────
    app.get(`${api}/latest/comics`, wrapHandler(async (req, res) => {
        const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
        const result = await crawler.rank.latest(page);
        const list = (Array.isArray(result) ? result : []).map((item) => {
            const id = Number(item.aid || item.id);
            const o = {
                ...item,
                id,
                name: String(item.title || item.name || ''),
                cover: String(item.cover || item.image || ''),
                author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                total_views: String(item.views ?? ''),
                likes: String(item.likes ?? ''),
                inStore: false,
                canRead: false,
            };
            return rewriteComicMediaUrls(o);
        });
        await enrichStoreFlags(list);
        res.json({ok: true, list, total: result?.total || list.length});
    }));

    // ── 分类 ───────────────────────────────────────────────────
    app.get(`${api}/category/info`, wrapHandler(async (_req, res) => {
        const info = await crawler.rank.categories();
        res.json({ok: true, categories: info?.categories || [], blocks: info?.blocks || []});
    }));

    app.get(`${api}/category/filter`, wrapHandler(async (req, res) => {
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        const time = String(req.query.time || 'a').slice(0, 1) || 'a';
        const slug = String(req.query.slug || '');
        const sort = String(req.query.sort || 'mv');
        const sub = String(req.query.sub || '');
        const result = await crawler.rank.categoriesFilter(page, time, slug, sort, sub);
        const list = (result?.content || []).map((item) => {
            const id = Number(item.id);
            const o = {
                ...item,
                id,
                name: String(item.name || ''),
                cover: String(item.image || ''),
                author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                total_views: String(item.total_views ?? ''),
                likes: String(item.likes ?? ''),
                inStore: false,
                canRead: false,
            };
            return rewriteComicMediaUrls(o);
        });
        await enrichStoreFlags(list);
        res.json({ok: true, list, total: result?.total || list.length, pages: result?.pages || 1});
    }));

    // ── 推广 ───────────────────────────────────────────────────
    app.get(`${api}/promote`, wrapHandler(async (_req, res) => {
        const list = await crawler.promote.list();
        const sections = (list || []).map((s) => ({
            id: String(s.id || ''),
            title: String(s.title || ''),
            slug: String(s.slug || ''),
            type: String(s.type || ''),
            filter_val: String(s.filter_val || ''),
            content: (s.content || []).map((item) => {
                const id = Number(item.id || item.aid);
                const o = {
                    id,
                    name: String(item.name || item.title || ''),
                    author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                    cover: String(item.image || ''),
                    category: item.category || null,
                    category_sub: item.category_sub || null,
                    liked: !!item.liked,
                    is_favorite: !!item.is_favorite,
                    update_at: item.update_at || 0,
                };
                return rewriteComicMediaUrls(o);
            }),
        }));
        res.json({ok: true, list: sections});
    }));

    app.get(`${api}/promote/sections`, wrapHandler(async (_req, res) => {
        const list = await crawler.promote.sections();
        res.json({ok: true, list});
    }));

    app.get(`${api}/promote/list`, wrapHandler(async (req, res) => {
        const id = parseInt(req.query.id, 10);
        const page = parseInt(req.query.page, 10);
        if (!Number.isFinite(id)) {
            return res.status(400).json({ok: false, message: 'missing id'});
        }
        const result = await crawler.promote.promoteList(id, Number.isFinite(page) ? page : 0);
        const list = (result?.list || []).map((item) => {
            const id2 = Number(item.aid || item.id);
            const o = {
                ...item,
                id: id2,
                name: String(item.title || item.name || ''),
                cover: String(item.cover || item.image || ''),
                author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                inStore: false,
                canRead: false,
            };
            return rewriteComicMediaUrls(o);
        });
        await enrichStoreFlags(list);
        res.json({ok: true, list, total: result?.total || 0});
    }));
};
