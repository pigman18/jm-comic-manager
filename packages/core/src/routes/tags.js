'use strict';

/**
 * 联想搜索路由（带内存缓存）
 *   GET /api/tags?query=
 *   GET /api/works?query=
 *   GET /api/actors?query=
 */
module.exports = function registerTagsRoutes(app, ctx) {
    const {api, store, wrapHandler} = ctx;

    const TAGS_CACHE_TTL = 5 * 60 * 1000; // 5 分钟
    const TAGS_CACHE_MAX = 100;           // 最多缓存 100 个查询

    const tagsCache = new Map();
    const worksCache = new Map();

    app.get(`${api}/tags`, wrapHandler(async (req, res) => {
        const query = String(req.query.query || '').trim();
        if (!query) {
            res.json({ok: true, tags: []}).end();
            return;
        }
        const now = Date.now();
        const cached = tagsCache.get(query);
        if (cached && cached.expireAt > now) {
            res.json({ok: true, tags: cached.tags, fromCache: true}).end();
            return;
        }
        let tags = await store.comicMeta.listTags(query);
        tags = [...new Set(tags)]
            .filter((tag) => tag && tag.trim())
            .sort((a, b) => a.localeCompare(b))
            .slice(0, 50);
        tagsCache.set(query, {tags, expireAt: now + TAGS_CACHE_TTL});
        if (tagsCache.size > TAGS_CACHE_MAX) {
            for (const [key, value] of tagsCache.entries()) {
                if (value.expireAt <= now) tagsCache.delete(key);
            }
        }
        res.json({ok: true, tags, fromCache: false}).end();
    }));

    app.get(`${api}/works`, wrapHandler(async (req, res) => {
        const query = String(req.query.query || '').trim();
        if (!query) {
            res.json({ok: true, works: []}).end();
            return;
        }
        const now = Date.now();
        const cached = worksCache.get(query);
        if (cached && cached.expireAt > now) {
            res.json({ok: true, works: cached.works, fromCache: true}).end();
            return;
        }
        let works = await store.comicMeta.listWorks(query);
        works = [...new Set(works)]
            .filter((w) => w && w.trim())
            .sort((a, b) => a.localeCompare(b))
            .slice(0, 50);
        worksCache.set(query, {works, expireAt: now + TAGS_CACHE_TTL});
        if (worksCache.size > TAGS_CACHE_MAX) {
            for (const [key, value] of worksCache.entries()) {
                if (value.expireAt <= now) worksCache.delete(key);
            }
        }
        res.json({ok: true, works, fromCache: false}).end();
    }));

    app.get(`${api}/actors`, wrapHandler(async (req, res) => {
        const query = String(req.query.query || '').trim();
        if (!query) {
            res.json({ok: true, actors: []}).end();
            return;
        }
        const actors = await store.comicMeta.listActors(query);
        res.json({ok: true, actors}).end();
    }));
};
