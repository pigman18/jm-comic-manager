'use strict';

const path = require('node:path');
const { Worker } = require('node:worker_threads');

function openDatabase(filePath) {
    const raw = String(filePath || '').trim();
    const fp = raw === ':memory:' ? raw : path.resolve(raw);
    if (!fp) throw new Error('sqlite: empty database path');

    const workerScript = `
const { parentPort } = require('node:worker_threads');
const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync(${JSON.stringify(fp)});
function execStmt(sql, args) {
    const stmt = db.prepare(sql);
    if (args === undefined) { stmt.run(); return; }
    if (Array.isArray(args)) { stmt.run(...args); return; }
    stmt.run(args);
}
function getRow(sql, args) {
    const stmt = db.prepare(sql);
    if (args === undefined) return stmt.get() || null;
    if (Array.isArray(args)) return stmt.get(...args) || null;
    return stmt.get(args) || null;
}
function getAll(sql, args) {
    const stmt = db.prepare(sql);
    if (args === undefined) return stmt.all();
    if (Array.isArray(args)) return stmt.all(...args);
    return stmt.all(args);
}
parentPort.on('message', (msg) => {
    const { id, method, args } = msg;
    try {
        let result;
        switch (method) {
            case 'exec': db.exec(args[0]); result = undefined; break;
            case 'run': execStmt(args[0], args[1]); result = undefined; break;
            case 'get': result = getRow(args[0], args[1]); break;
            case 'all': result = getAll(args[0], args[1]); break;
            case 'close': db.close(); result = undefined; break;
        }
        parentPort.postMessage({ id, result });
    } catch (e) {
        parentPort.postMessage({ id, error: e ? (e.message || String(e)) : 'unknown error' });
    }
});
`;

    const worker = new Worker(workerScript, { eval: true });

    let idCounter = 0;
    const pending = new Map();

    worker.on('message', (msg) => {
        const { id, result, error } = msg;
        const entry = pending.get(id);
        if (!entry) return;
        pending.delete(id);
        if (error) entry.reject(new Error(error));
        else entry.resolve(result);
    });

    worker.on('error', (err) => {
        for (const [id, entry] of pending) {
            entry.reject(err);
            pending.delete(id);
        }
    });

    worker.on('exit', (code) => {
        if (code !== 0) {
            for (const [id, entry] of pending) {
                entry.reject(new Error('Worker exited with code ' + code));
                pending.delete(id);
            }
        }
    });

    function send(method, args) {
        return new Promise((resolve, reject) => {
            const id = ++idCounter;
            pending.set(id, { resolve, reject });
            worker.postMessage({ id, method, args });
        });
    }

    function normalizeParams(values) {
        if (values == null) return undefined;
        if (Array.isArray(values)) return values;
        if (typeof values === 'object') return values;
        return [values];
    }

    let exiting = false;
    async function gracefulShutdown(signal) {
        if (exiting) return;
        exiting = true;
        try {
            await send('close', []);
        } catch {}
        try { await worker.terminate(); } catch {}
        process.exit(0);
    }
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('uncaughtException', (err) => {
        console.error(err);
        gracefulShutdown('uncaughtException');
    });

    return {
        async exec(sql) {
            await send('exec', [sql]);
        },
        prepare(sql) {
            return {
                async run(values) {
                    await send('run', [sql, normalizeParams(values)]);
                },
                async get(values) {
                    return await send('get', [sql, normalizeParams(values)]);
                },
                async all(values) {
                    return await send('all', [sql, normalizeParams(values)]);
                },
            };
        },
        commit() {
            // node:sqlite auto-commits
        },
        async close() {
            try {
                await send('close', []);
            } catch {}
            try { await worker.terminate(); } catch {}
        },
    };
}

module.exports = { openDatabase };
