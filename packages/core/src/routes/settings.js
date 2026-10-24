'use strict';

/**
 * 配置与同步路由
 *   GET/PUT /api/settings   业务设置（和谐模式等）
 *   GET/POST /api/config    应用配置（schema 驱动，首启引导与设置页使用）
 *   POST /api/sync/*        本地↔数据库同步
 */
const {FIELD_MAP, visibleFields, coerceValue} = require('../config-schema');

module.exports = function registerSettingsRoutes(app, ctx) {
    const {api, config, manifest, store, wrapHandler} = ctx;

    // ── 业务设置 ────────────────────────────────────────────────
    app.get(`${api}/settings`, (_req, res) => {
        const bundleConfig = typeof config.get === 'function' ? config.get() : {...config};
        res.json({ok: true, bundleConfig});
    });

    app.put(`${api}/settings`, (req, res, next) => {
        try {
            const body = req.body || {};
            const bc = body.bundleConfig;
            if (bc && typeof bc === 'object') {
                for (const [k, v] of Object.entries(bc)) {
                    config.setValue(k, v);
                }
                config.trigger(manifest);
            }
            res.json({ok: true});
        } catch (e) {
            next(e);
        }
    });

    // ── 应用配置（schema 驱动）──────────────────────────────────
    app.get(`${api}/config`, (_req, res) => {
        try {
            const cur = typeof config.get === 'function' ? config.get() : {...config};
            const fields = visibleFields().map((f) => ({
                key: f.key,
                label: f.label,
                type: f.type,
                group: f.group,
                placeholder: f.placeholder,
                requiresRestart: !!f.requiresRestart,
                min: f.min,
                max: f.max,
            }));
            const values = {};
            for (const f of visibleFields()) {
                const v = cur[f.key];
                // 密码不在 GET 中回传明文，只回传是否已设置
                if (f.type === 'password') {
                    values[f.key] = '';
                    values[`${f.key}__hasValue`] = !!(v && String(v).length);
                } else {
                    values[f.key] = v == null ? null : v;
                }
            }
            res.json({
                ok: true,
                fields,
                values,
                setupCompleted: !!cur.setupCompleted,
            });
        } catch (e) {
            res.json({ok: false, message: String(e.message || e)});
        }
    });

    app.post(`${api}/config`, (req, res) => {
        try {
            const body = req.body && typeof req.body === 'object' ? req.body : {};
            const patch = body.values && typeof body.values === 'object' ? body.values : body;
            const saved = [];
            const errors = [];
            for (const [k, raw] of Object.entries(patch)) {
                const field = FIELD_MAP[k];
                // 只允许写入 schema 中可见的字段（内部字段走各自的业务接口）
                if (!field || field.hidden) continue;
                const r = coerceValue(field, raw);
                if (!r.ok) { errors.push(r.message); continue; }
                // 密码留空表示"不修改"
                if (field.type === 'password' && r.value === '') continue;
                config.setValue(k, r.value);
                saved.push(k);
            }
            if (body.setupCompleted === true) config.setValue('setupCompleted', true);
            if (errors.length) {
                res.json({ok: false, message: errors.join('；'), saved});
                return;
            }
            config.trigger(manifest);
            res.json({ok: true, saved});
        } catch (e) {
            res.json({ok: false, message: String(e.message || e)});
        }
    });

    // ── 本地 ↔ 数据库同步 ──────────────────────────────────────
    app.post(`${api}/sync/local2db`, wrapHandler(async (_req, res) => {
        store.runLocal2Db();
        res.json({ok: true});
    }));

    app.post(`${api}/sync/db2local`, wrapHandler(async (_req, res) => {
        store.runDb2Local();
        res.json({ok: true});
    }));

    app.post(`${api}/sync/rebuild-cache`, wrapHandler(async (_req, res) => {
        await store.comicMeta.syncAllTags();
        await store.comicMeta.syncAllAuthors();
        res.json({ok: true});
    }));
};
