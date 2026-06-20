'use strict';

const path = require('node:path');
const sqlite = require('node:sqlite');

function normalizeParams(values) {
    if (values == null) return undefined;
    if (typeof values !== 'object' || Array.isArray(values)) return values;
    return { ...values };
}

function openDatabase(filePath) {
    const fp = path.resolve(String(filePath || '').trim());
    if (!fp) throw new Error('sqlite: empty database path');

    const db = new sqlite.DatabaseSync(fp, {
        openMode: sqlite.DatabaseSync.OPEN_READWRITE |
            sqlite.DatabaseSync.OPEN_CREATE,
    });

    // ✅ 兼容所有 Node 22 版本
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA synchronous = NORMAL');

    return {
        exec(sql) {
            db.exec(sql);
        },

        prepare(sql) {
            const stmt = db.prepare(sql);

            return {
                run(values) {
                    const p = normalizeParams(values);
                    if (p === undefined) return stmt.run();
                    if (Array.isArray(p)) return stmt.run(...p);
                    return stmt.run(p);
                },
                get(values) {
                    const p = normalizeParams(values);
                    if (p === undefined) return stmt.get();
                    if (Array.isArray(p)) return stmt.get(...p);
                    return stmt.get(p);
                },
                all(values) {
                    const p = normalizeParams(values);
                    if (p === undefined) return stmt.all();
                    if (Array.isArray(p)) return stmt.all(...p);
                    return stmt.all(p);
                },
            };
        },

        commit() {
            // node:sqlite 自动提交
        },

        close() {
            db.close();
        },
    };
}

module.exports = { openDatabase };
