'use strict';

/**
 * 下载任务路由
 *   POST /api/comics/:num/download    创建下载任务
 *   POST /api/comics/:num/batch-add   批量加入任务
 */
module.exports = function registerTasksRoutes(app, ctx) {
    const {api, taskManager, wrapHandler} = ctx;

    app.post(`${api}/comics/:num/download`, wrapHandler(async (req, res) => {
        const album = Math.floor(Number(req.params.num));
        const episodeNumber = Math.floor(Number(req.body.episodeNumber));
        const n = Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : album;
        const coverUrl = String(req.body.coverUrl || '');
        const name = String(req.body.title || req.body.name || '');
        const episodeName = String(req.body.episodeTitle || req.body.episodeName || '');
        const downloadLabel = String(req.body.downloadLabel || '').slice(0, 240);
        const tagsBody = req.body.tags;
        const comicTags = Array.isArray(tagsBody) ? tagsBody.filter(Boolean).map(String) : [];
        const withMeta = req.body.withMeta !== false;

        // 构建展示标题
        let displayTitle;
        if (n !== album && episodeName) {
            displayTitle = `JM${n}: ${name || `#${album}`} - ${episodeName}`;
        } else {
            displayTitle = `JM${album}: ${name || `#${album}`}`;
        }

        // 封面转 base64（失败不影响下载）
        let coverBase64 = '';
        if (coverUrl) {
            try {
                const resp = await fetch(coverUrl, {signal: AbortSignal.timeout(5000)});
                if (resp.ok) {
                    const buf = Buffer.from(await resp.arrayBuffer());
                    const mime = resp.headers.get('content-type') || 'image/jpeg';
                    coverBase64 = `data:${mime};base64,${buf.toString('base64')}`;
                }
            } catch (_) { /* 忽略封面失败 */ }
        }

        if (taskManager) {
            const taskLabels = name ? [name, ...comicTags] : [album.toString(), downloadLabel].filter(Boolean);
            const result = await taskManager.addTask(n, taskLabels, {
                coverBase64,
                displayTitle,
                episodeNumber: n,
                withMeta,
            });
            if (!result.ok) {
                res.json(result);
                return;
            }
        }
        res.json({ok: true});
    }));

    app.post(`${api}/comics/:num/batch-add`, wrapHandler(async (req, res) => {
        const num = Math.floor(Number(req.params.num));
        if (!Number.isFinite(num)) {
            res.json({ok: false, message: '无效 JM 编码'});
            return;
        }
        const withMeta = req.body.withMeta !== false;

        if (!taskManager) {
            res.json({ok: false, message: '任务管理器不可用'});
            return;
        }

        const result = await taskManager.addTask(num, [], {
            episodeNumber: num,
            withMeta,
        });
        res.json(result);
    }));
};
