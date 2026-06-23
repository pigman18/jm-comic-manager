'use strict';

const path = require('node:path');
const sqlite = require('node:sqlite');

function normalizeParams(values) {
    if (values == null) return undefined;
    if (typeof values !== 'object' || Array.isArray(values)) return values;
    return { ...values };
}

function finalizeDb(db) {
    try { db.exec('PRAGMA wal_checkpoint(TRUNCATE)'); } catch {}
    try { db.exec('PRAGMA journal_mode = DELETE'); } catch {}
    try { db.close(); } catch {}
}

function openDatabase(filePath) {
    const fp = path.resolve(String(filePath || '').trim());
    if (!fp) throw new Error('sqlite: empty database path');

    const db = new sqlite.DatabaseSync(fp, {
        openMode: sqlite.DatabaseSync.OPEN_READWRITE |
            sqlite.DatabaseSync.OPEN_CREATE,
    });

    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA synchronous = NORMAL');

    let exiting = false;
    async function gracefulShutdown(signal) {
        if (exiting) return;
        exiting = true;
        console.log(`收到 ${signal}，开始清理数据库...`);
        try {
            await finalizeDb(db);
            console.log('数据库清理完成');
        } finally {
            process.exit(0);
        }
    }
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('uncaughtException', (err) => {
        console.error(err);
        gracefulShutdown('uncaughtException');
    });

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
            finalizeDb(db);
        },
    };
}

module.exports = { openDatabase };
