'use strict';

/**
 * 评论区路由
 *   GET  /api/forum/list   评论流
 *   GET  /api/forum        指定漫画/用户的评论
 *   POST /api/comment      发表评论
 */
module.exports = function registerForumRoutes(app, ctx) {
    const {api, config, crawler, wrapHandler} = ctx;

    app.get(`${api}/forum/list`, wrapHandler(async (req, res) => {
        const mode = String(req.query.mode || 'all');
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        const data = await crawler.forum.feed(mode, page);
        res.json({ok: true, ...data});
    }));

    app.get(`${api}/forum`, wrapHandler(async (req, res) => {
        const aid = String(req.query.aid || '');
        let uid = String(req.query.uid || '');
        const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
        let data;
        if (aid) {
            data = await crawler.forum.list(aid, page);
        } else if (uid || req.query.my === '1') {
            if (!uid) uid = String(config.memberInfo?.uid || '');
            if (!uid) { res.json({ok: false, message: '未登录'}); return; }
            data = await crawler.forum.byUser(uid, page);
        } else {
            res.json({ok: false, message: 'aid 或 uid 参数必填'});
            return;
        }
        res.json({ok: true, ...data});
    }));

    app.post(`${api}/comment`, wrapHandler(async (req, res) => {
        const comment = String(req.body.comment || '').trim();
        const aid = String(req.body.aid || '');
        const comment_id = req.body.comment_id ? String(req.body.comment_id).trim() : '';
        if (!comment) { res.json({ok: false, message: '评论内容不能为空'}); return; }
        const data = await crawler.forum.post(comment, aid, comment_id);
        res.json({ok: data.status === 'ok', ...data});
    }));
};
