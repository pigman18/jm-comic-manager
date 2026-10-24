'use strict';

/**
 * 账号路由
 *   POST /api/login           登录
 *   POST /api/logout          登出
 *   POST /api/account/sign    每日签到
 */
module.exports = function registerAccountRoutes(app, ctx) {
    const {api, config, crawler} = ctx;

    app.post(`${api}/account/sign`, async (_req, res) => {
        try {
            const result = await crawler.account.sign();
            res.json({ok: true, msg: result?.msg || '签到成功'});
        } catch (e) {
            res.json({ok: false, message: String(e.message || e)});
        }
    });

    app.post(`${api}/login`, async (req, res) => {
        try {
            const {username, password} = req.body || {};
            const u = (username || config.username || '').trim();
            const p = (password || config.password || '').trim();
            if (!u || !p) {
                return res.json({ok: false, message: '请输入用户名和密码'});
            }
            config.setValue('username', u);
            config.setValue('password', p);
            const result = await crawler.account.login();
            if (!result?.memberInfo) {
                config.setValue('username', '');
                config.setValue('password', '');
                return res.json({ok: false, message: '登录失败，请检查用户名和密码'});
            }
            res.json({ok: true, memberInfo: result.memberInfo});
        } catch (e) {
            config.setValue('username', '');
            config.setValue('password', '');
            res.json({ok: false, message: String(e.message || e)});
        }
    });

    app.post(`${api}/logout`, async (_req, res) => {
        try {
            config.setValue('username', '');
            config.setValue('password', '');
            config.setValue('token', '');
            config.setValue('cookie', '');
            config.setValue('memberInfo', null);
            res.json({ok: true});
        } catch (e) {
            res.json({ok: false, message: String(e.message || e)});
        }
    });
};
