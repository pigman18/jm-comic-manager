'use strict';

/**
 * 收藏夹路由
 *   GET  /api/favorites/comics               收藏列表
 *   GET  /api/favorites/folders              收藏夹列表
 *   POST /api/favorites/comics/:num/toggle   收藏/取消
 *   POST /api/favorites/folder               收藏夹增删改
 *   POST /api/favorites/comics/move          移动收藏
 */
const path = require('node:path');
const {isNotEmptySync} = require('../../util/file');

module.exports = function registerFavoritesRoutes(app, ctx) {
    const {api, config, store, crawler, wrapHandler, rewriteComicMediaUrls} = ctx;

    app.get(`${api}/favorites/comics`, wrapHandler(async (req, res) => {
        const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
        const folderId = String(req.query.folder_id || '');
        const data = await crawler.account.getFavorites(page, folderId);
        const items = Array.isArray(data) ? data : (data?.list || data?.rows || []);
        const folders = data?.folder_list || [];
        const comicDir = path.join(config.dataDir, 'comic');
        const list = await Promise.all(items.map(async (item) => {
            const id = Number(item.aid || item.id);
            const o = {
                ...item,
                id,
                name: String(item.title || item.name || ''),
                cover: String(item.cover || item.image || ''),
                author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                total_views: String(item.views ?? item.total_views ?? ''),
                likes: String(item.likes ?? ''),
                inStore: false,
                canRead: false,
            };
            const merged = rewriteComicMediaUrls(o);
            const dbRow = await store.comicMeta.get(id);
            merged.inStore = !!dbRow;
            merged.canRead = isNotEmptySync(path.join(comicDir, `${id}.zip`));
            return merged;
        }));
        res.json({ok: true, list, total: list.length, folders});
    }));

    app.get(`${api}/favorites/folders`, wrapHandler(async (_req, res) => {
        const data = await crawler.account.getFavorites(1);
        res.json({ok: true, folders: data?.folder_list || []});
    }));

    app.post(`${api}/favorites/comics/:num/toggle`, wrapHandler(async (req, res) => {
        const num = Math.floor(Number(req.params.num));
        if (!Number.isFinite(num) || num < 1) {
            res.status(400).json({ok: false, message: '无效编码'});
            return;
        }
        const favorite = req.body?.favorite === true;
        if (favorite) {
            await crawler.account.addFavorite(num);
            const folderId = String(req.body?.folder_id || '').trim();
            if (folderId) {
                await crawler.account.moveToFolder(num, folderId, folderId);
            }
        } else {
            await crawler.account.removeFavorite(num);
        }
        res.json({ok: true, favorite});
    }));

    app.post(`${api}/favorites/folder`, wrapHandler(async (req, res) => {
        const {action, folder_id, folder_name} = req.body || {};
        if (action === 'add') {
            if (!folder_name) { res.status(400).json({ok: false, message: '请输入文件夹名称'}); return; }
            await crawler.account.createFolder(folder_name);
            res.json({ok: true});
        } else if (action === 'rename') {
            if (!folder_id || !folder_name) { res.status(400).json({ok: false, message: '参数不完整'}); return; }
            await crawler.account.renameFolder(folder_id, folder_name);
            res.json({ok: true});
        } else if (action === 'del') {
            if (!folder_id) { res.status(400).json({ok: false, message: '参数不完整'}); return; }
            await crawler.account.deleteFolder(folder_id);
            res.json({ok: true});
        } else {
            res.status(400).json({ok: false, message: '无效操作'});
        }
    }));

    app.post(`${api}/favorites/comics/move`, wrapHandler(async (req, res) => {
        const {album_id, source_folder_id, target_folder_id} = req.body || {};
        if (!album_id || !target_folder_id) {
            res.status(400).json({ok: false, message: '参数不完整'});
            return;
        }
        let source = source_folder_id;
        if (!source) {
            const allData = await crawler.account.getFavorites(1);
            const folders = allData?.folder_list || [];
            source = folders[0]?.FID;
        }
        if (!source) {
            res.status(400).json({ok: false, message: '请先创建收藏夹'});
            return;
        }
        await crawler.account.moveToFolder(album_id, source, target_folder_id);
        res.json({ok: true});
    }));
};
