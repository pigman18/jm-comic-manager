'use strict'

const fs = require('node:fs');
const path = require('node:path');

const {mkdirSyncIfNotExists, listFiles, writeToFileSync, getBaseName} = require('../util/file');
const {openDatabase} = require('../util/sqlite-compat');
const {PHASE, STATE} = require('./protocol');

/**
 * JM 模块数据存储
 * @param manifest      JM 模块应用配置
 * @param ctx           上下文对象
 * @param message     JM 模块消息分发器
 * @param config      JM 模块用户配置
 * @return {object}
 */
function createStore(manifest, ctx, message, config, crawler) {
    let dbPath = path.resolve(`${config.dataDir}/jm.bundle.sqlite`);
    let database = null;
    let insertSQl = `
    INSERT INTO comic_meta (
      id, name, images, addtime, description, total_views, likes,
      series, series_id, comment_total, author, tags, works, actors,
      related_list, liked, is_favorite, is_aids, price, purchased,
      create_time, update_time
    )
    VALUES (
      @id, @name, @images, @addtime, @description, @total_views, @likes,
      @series, @series_id, @comment_total, @author, @tags, @works, @actors,
      @related_list, @liked, @is_favorite, @is_aids, @price, @purchased,
      strftime('%s','now'), strftime('%s','now')
    )
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      images = EXCLUDED.images,
      addtime = EXCLUDED.addtime,
      description = EXCLUDED.description,
      total_views = EXCLUDED.total_views,
      likes = EXCLUDED.likes,
      series = EXCLUDED.series,
      series_id = EXCLUDED.series_id,
      comment_total = EXCLUDED.comment_total,
      author = EXCLUDED.author,
      tags = EXCLUDED.tags,
      works = EXCLUDED.works,
      actors = EXCLUDED.actors,
      related_list = EXCLUDED.related_list,
      liked = EXCLUDED.liked,
      is_favorite = EXCLUDED.is_favorite,
      is_aids = EXCLUDED.is_aids,
      price = EXCLUDED.price,
      purchased = EXCLUDED.purchased,
      create_time = comic_meta.create_time,
      update_time = strftime('%s','now');
  `;

    function jsonRowToDb(obj) {
        return {
            id: Number(obj.id),
            name: String(obj.name ?? ''),
            images: JSON.stringify(obj.images || []),
            addtime: String(obj.addtime ?? ''),
            description: String(obj.description ?? ''),
            total_views: String(obj.total_views ?? ''),
            likes: String(obj.likes ?? ''),
            series: JSON.stringify((obj.series || []).map((ep) => ({
                id: String(ep.id),
                name: ep.name || ep.title || ep.text,
                sort: String(ep.sort ?? ''),
            }))),
            series_id: String(obj.series_id ?? ''),
            comment_total: String(obj.comment_total ?? ''),
            author: JSON.stringify(obj.author || []),
            tags: JSON.stringify((obj.tags || []).map(t => String(t).trim())),
            works: JSON.stringify(obj.works || []),
            actors: JSON.stringify(obj.actors || []),
            related_list: JSON.stringify(obj.related_list || []),
            liked: obj.liked ? 1 : 0,
            is_favorite: obj.is_favorite ? 1 : 0,
            is_aids: obj.is_aids ? 1 : 0,
            price: Number(obj.price) || 0,
            purchased: String(obj.purchased ?? ''),
        };
    }

    /** 将 DB 行转为 JmMeta JSON */
    function dbRowToJson(row) {
        const parseJson = (s, fb) => {
            if (s == null || s === '') return fb;
            if (typeof s !== 'string') return s;
            return JSON.parse(s);
        };
        const images = parseJson(row.images, []);
        return {
            id: row.id != null && typeof row.id === 'bigint' ? Number(row.id) : row.id,
            name: row.name,
            images,
            cover: images[0] || null,
            addtime: row.addtime,
            description: row.description,
            total_views: row.total_views,
            likes: row.likes,
            series: parseJson(row.series, []),
            series_id: row.series_id,
            comment_total: row.comment_total,
            author: parseJson(row.author, []),
            tags: parseJson(row.tags, []),
            works: parseJson(row.works, []),
            actors: parseJson(row.actors, []),
            related_list: parseJson(row.related_list, []),
            liked: !!row.liked,
            is_favorite: !!row.is_favorite,
            is_aids: !!row.is_aids,
            price: row.price,
            purchased: row.purchased,
            create_time: row.create_time,
            update_time: row.update_time,
        };
    }

    async function connect() {
        if (database) return database;
        mkdirSyncIfNotExists(path.dirname(dbPath));
        database = openDatabase(dbPath);
        database.exec(`
      CREATE TABLE IF NOT EXISTS comic_meta (
        id INTEGER PRIMARY KEY,
        name TEXT, images JSON, addtime TEXT, description TEXT,
        total_views TEXT, likes TEXT, series JSON, series_id TEXT,
        comment_total TEXT, author JSON, tags JSON, works JSON,
        actors JSON, related_list JSON, liked INTEGER, is_favorite INTEGER,
        is_aids INTEGER, price INTEGER, purchased TEXT,
        create_time INTEGER, update_time INTEGER
      );
    `);
        // 兼容旧表：可能缺少 create_time / update_time
        try { database.exec('ALTER TABLE comic_meta ADD COLUMN create_time INTEGER'); } catch (_) {}
        try { database.exec('ALTER TABLE comic_meta ADD COLUMN update_time INTEGER'); } catch (_) {}
        // 索引 — WHERE 过滤
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_series_id ON comic_meta(series_id)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_name ON comic_meta(name)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_author ON comic_meta(author)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_comment_total ON comic_meta(comment_total)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_price ON comic_meta(price)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_purchased ON comic_meta(purchased)'); } catch (_) {}
        // 复合排序索引 — 让 ORDER BY + LIMIT 直接走索引扫描
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_update ON comic_meta(update_time, id)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_create ON comic_meta(create_time, id)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_views ON comic_meta(total_views, id)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_likes ON comic_meta(likes, id)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_name ON comic_meta(name, id)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_addtime ON comic_meta(addtime, id)'); } catch (_) {}
        // FTS5 全文索引
        try {
            // FTS5 不支持 ALTER TABLE，旧表缺少新列时必须 DROP 重建
            const recreateFts = (() => {
                try {
                    database.exec('SELECT tags FROM comic_meta_fts LIMIT 0');
                    return false; // tags 列已存在
                } catch (_) {
                    database.exec('DROP TABLE IF EXISTS comic_meta_fts');
                    return true;
                }
            })();
            database.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS comic_meta_fts USING fts5(
                name, author, description, tags, works, actors,
                content='comic_meta',
                content_rowid='id',
                tokenize='unicode61'
            )`);
            if (recreateFts) {
                database.exec(`INSERT OR IGNORE INTO comic_meta_fts(rowid, name, author, description, tags, works, actors)
                    SELECT id, name, author, description, tags, works, actors FROM comic_meta`);
            }
            database.exec('DROP TRIGGER IF EXISTS comic_meta_fts_ai');
            database.exec('DROP TRIGGER IF EXISTS comic_meta_fts_ad');
            database.exec('DROP TRIGGER IF EXISTS comic_meta_fts_au');
            database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_fts_ai AFTER INSERT ON comic_meta BEGIN
                INSERT INTO comic_meta_fts(rowid, name, author, description, tags, works, actors)
                VALUES (new.id, new.name, new.author, new.description, new.tags, new.works, new.actors);
            END`);
            database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_fts_ad AFTER DELETE ON comic_meta BEGIN
                INSERT INTO comic_meta_fts(comic_meta_fts, rowid, name, author, description, tags, works, actors)
                VALUES ('delete', old.id, old.name, old.author, old.description, old.tags, old.works, old.actors);
            END`);
            database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_fts_au AFTER UPDATE ON comic_meta BEGIN
                INSERT INTO comic_meta_fts(comic_meta_fts, rowid, name, author, description, tags, works, actors)
                VALUES ('delete', old.id, old.name, old.author, old.description, old.tags, old.works, old.actors);
                INSERT INTO comic_meta_fts(rowid, name, author, description, tags, works, actors)
                VALUES (new.id, new.name, new.author, new.description, new.tags, new.works, new.actors);
            END`);
        } catch (e) {
            console.warn('[store] FTS5 不可用，将使用 LIKE 搜索:', e.message);
        }
        database.exec(`
      CREATE TABLE IF NOT EXISTS comic_read (
        id INTEGER PRIMARY KEY,
        read_time INTEGER NOT NULL DEFAULT (strftime('%s','now'))
      );
    `);
        database.exec(`
      CREATE TABLE IF NOT EXISTS comic_ban (
        id INTEGER PRIMARY KEY,
        banned_time INTEGER NOT NULL DEFAULT (strftime('%s','now'))
      );
    `);
        // 标签关联表（代替 json_each 全表扫描）
        database.exec(`
            CREATE TABLE IF NOT EXISTS comic_meta_tag (
                comic_id INTEGER NOT NULL,
                tag TEXT NOT NULL,
                PRIMARY KEY (comic_id, tag)
            )
        `);
        database.exec('CREATE INDEX IF NOT EXISTS idx_meta_tag_tag ON comic_meta_tag(tag)');
        // 保留 DELETE 级联触发器，INSERT/UPDATE 改为显式管理避免偶发 UNIQUE 冲突
        database.exec(`DROP TRIGGER IF EXISTS comic_meta_tag_ai`);
        database.exec(`DROP TRIGGER IF EXISTS comic_meta_tag_au`);
        database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_tag_ad AFTER DELETE ON comic_meta BEGIN
            DELETE FROM comic_meta_tag WHERE comic_id = old.id;
        END`);
        // 自动同步标签表：已有数据但关联表为空
        try {
            const tagCount = database.prepare('SELECT COUNT(*) as c FROM comic_meta_tag').get({}).c;
            if (tagCount === 0) {
                database.exec(`INSERT OR IGNORE INTO comic_meta_tag(comic_id, tag)
                    SELECT c.id, t.value FROM comic_meta c, json_each(c.tags) t`);
            }
        } catch (_) {}
        // 自动重建 FTS：已有数据但 FTS 表为空
        try {
            const ftsCount = database.prepare('SELECT COUNT(*) as c FROM comic_meta_fts').get({}).c;
            if (ftsCount === 0) {
                database.exec(`INSERT OR IGNORE INTO comic_meta_fts(rowid, name, author, description, tags, works, actors)
                    SELECT id, name, author, description, tags, works, actors FROM comic_meta`);
            }
        } catch (_) {}
        return database;
    }

    function syncComicTags(conn, comicId, tagsJson) {
        conn.prepare('DELETE FROM comic_meta_tag WHERE comic_id = ?').run(comicId);
        const tags = JSON.parse(tagsJson || '[]');
        if (!tags.length) return;
        const stmt = conn.prepare('INSERT OR IGNORE INTO comic_meta_tag(comic_id, tag) VALUES (?, ?)');
        for (const t of tags) {
            const tag = String(t).trim();
            if (tag) stmt.run([comicId, tag]);
        }
    }

    async function saveOrUpdateBatch(anyList, toRow) {
        let conn = await connect();
        conn.exec('BEGIN TRANSACTION');
        const stmt = conn.prepare(insertSQl);
        for (let obj of anyList) {
            let row = await toRow(obj);
            if (row) {
                stmt.run(row);
                syncComicTags(conn, row.id, row.tags);
            }
        }
        conn.exec('COMMIT');
    }

    async function saveOrUpdate(row) {
        let conn = await connect();
        const stmt = conn.prepare(insertSQl);
        stmt.run(row);
        syncComicTags(conn, row.id, row.tags);
    }

    // ============ comicMeta sub-module ============

    async function has(id) {
        let conn = await connect();
        let total = conn.prepare('SELECT COUNT(1) as c FROM comic_meta WHERE id = ?').get(id).c;
        return total !== 0;
    }

    async function get(id) {
        let conn = await connect();
        return conn.prepare('SELECT * FROM comic_meta WHERE id = ?').get(id);
    }

    async function list() {
        let conn = await connect();
        return conn.prepare('SELECT * FROM comic_meta').all({});
    }

    async function listTags(query) {
        if (!query) return [];
        const conn = await connect();
        const rows = conn.prepare('SELECT DISTINCT tag FROM comic_meta_tag WHERE tag LIKE ? LIMIT 100').all(`%${query}%`);
        return rows.map(r => r.tag);
    }

    async function syncAllTags() {
        const conn = await connect();
        conn.exec('DELETE FROM comic_meta_tag');
        conn.exec(`INSERT OR IGNORE INTO comic_meta_tag(comic_id, tag)
            SELECT c.id, TRIM(t.value) FROM comic_meta c, json_each(c.tags) t`);
    }

    function makeFtsTerms(value) {
        const parts = [];
        // CJK
        const cjkRuns = value.match(/[\p{Script=Han}]+/gu) || [];
        for (const run of cjkRuns) {
            parts.push(`${run}*`);
        }
        // Latin / number
        const latinWords = value.match(/[a-zA-Z0-9]+/g) || [];
        for (const w of latinWords) {
            parts.push(`${w}*`);
        }
        // 日文 / 韩文 / 其他 Unicode：强制短语
        const covered = value.replace(/[\p{Script=Han}a-zA-Z0-9]+/gu, '');
        const others = covered.trim();
        if (others.length > 0) {
            const escaped = others.replace(/"/g, '""');
            parts.push(`"${escaped}"`);
        }
        return parts;
    }

    function columnMatch(column, value) {
        const terms = makeFtsTerms(value);
        return terms.map(t => `${column}:${t}`).join(' AND ');
    }

    function buildFtsMatch({ query, author, tags } = {}) {
        const parts = [];
        if (query) parts.push(makeFtsTerms(query).join(' AND '));
        if (author) parts.push(`(${columnMatch('author', author)})`);
        if (tags) parts.push(`(${columnMatch('tags', tags)})`);
        return parts.filter(Boolean).join(' AND ');
    }

    async function rebuildFtsIndex() {
        const conn = await connect();
        try {
            conn.exec('DELETE FROM comic_meta_fts');
            conn.exec(`INSERT INTO comic_meta_fts(rowid, name, author, description, tags, works, actors)
                SELECT id, name, author, description, tags, works, actors FROM comic_meta`);
        } catch (e) {
            console.warn('[store] FTS 索引重建失败:', e.message);
        }
    }

    async function page(qo) {
        const conn = await connect();
        const { name, author, id, tags, kind, banned, sort, order, page, pageSize, availDir } = qo;

        const parts = ['1=1'];
        const params = {};

        if (id) {
            parts.push('CAST(id AS TEXT) LIKE @i');
            params.i = `%${id}%`;
        } else {
            parts.push("(series_id IS NULL OR series_id = '' OR series_id = '0' OR series_id = id)");
        }
        if (kind === 'single') {
            parts.push("(series IS NULL OR series = '' OR series = '[]' OR json_array_length(series) < 2)");
        }
        if (kind === 'series') {
            parts.push("json_array_length(COALESCE(series, '[]')) > 1");
        }
        if (banned === 'true') {
            parts.push('EXISTS (SELECT 1 FROM comic_ban cb WHERE cb.id = comic_meta.id)');
        } else {
            parts.push('NOT EXISTS (SELECT 1 FROM comic_ban cb WHERE cb.id = comic_meta.id)');
        }
        if (availDir) {
            const zipIds = listFiles(availDir)
                .filter(f => f.endsWith('.zip'))
                .map(f => Number.parseInt(getBaseName(f)))
                .filter(n => Number.isFinite(n));
            if (zipIds.length > 0) {
                const clauses = zipIds.map((_, i) => `@avail${i}`);
                parts.push(`id IN (${clauses.join(',')})`);
                zipIds.forEach((id, i) => { params[`avail${i}`] = id; });
            } else {
                parts.push('0');
            }
        }

        const where = parts.join(' AND ');
        const orderBy = sort || 'update_time';
        const orderDir = order === 'ASC' ? 'ASC' : 'DESC';

        const hasSearch = !!(name || author || tags);
        if (hasSearch) {
            params.ftsMatch = buildFtsMatch({ query: name, author, tags });
            const ftsSQL = 'SELECT comic_meta.* FROM comic_meta INNER JOIN comic_meta_fts ON comic_meta.id = comic_meta_fts.rowid';
            const ftsWhere = `comic_meta_fts MATCH @ftsMatch AND ${where}`;
            const total = conn.prepare(`SELECT COUNT(*) as c FROM (${ftsSQL} WHERE ${ftsWhere})`).get(params).c;
            const rows = conn.prepare(`${ftsSQL} WHERE ${ftsWhere} ORDER BY ${orderBy} ${orderDir} LIMIT @lim OFFSET @off`).all({ ...params, lim: pageSize, off: (page - 1) * pageSize });
            return { total, rows };
        }

        const plainSQL = `SELECT * FROM comic_meta`;
        const total = conn.prepare(`SELECT COUNT(*) as c FROM (${plainSQL} WHERE ${where})`).get(params).c;
        const rows = conn.prepare(`${plainSQL} WHERE ${where} ORDER BY ${orderBy} ${orderDir} LIMIT @lim OFFSET @off`).all({ ...params, lim: pageSize, off: (page - 1) * pageSize });
        return { total, rows };
    }

    const comicMeta = {
        has,
        get,
        list,
        listTags,
        page,
        rebuildFtsIndex,
        syncAllTags,
        saveOrUpdate,
        saveOrUpdateBatch,
    };

    // ============ comicRead sub-module ============

    async function saveRead(episodeId) {
        const conn = await connect();
        const existing = conn.prepare('SELECT id FROM comic_read WHERE id = ?').get(episodeId);
        if (existing) return;
        conn.prepare('INSERT INTO comic_read (id) VALUES (?)').run(episodeId);
    }

    async function checkReads(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return [];
        const conn = await connect();
        const placeholders = ids.map(() => '?').join(',');
        const rows = conn.prepare(`SELECT id FROM comic_read WHERE id IN (${placeholders})`).all(ids);
        return rows.map(r => (typeof r.id === 'bigint' ? Number(r.id) : r.id));
    }

    const comicRead = {
        saveRead,
        checkReads,
    };

    // ============ comicBan sub-module ============

    async function addBan(comicId) {
        const conn = await connect();
        const existing = conn.prepare('SELECT id FROM comic_ban WHERE id = ?').get(comicId);
        if (existing) return false;
        conn.prepare('INSERT INTO comic_ban (id) VALUES (?)').run(comicId);
        return true;
    }

    async function removeBan(comicId) {
        const conn = await connect();
        const existing = conn.prepare('SELECT id FROM comic_ban WHERE id = ?').get(comicId);
        if (!existing) return false;
        conn.prepare('DELETE FROM comic_ban WHERE id = ?').run(comicId);
        return true;
    }

    async function listBans() {
        const conn = await connect();
        const rows = conn.prepare('SELECT id FROM comic_ban ORDER BY banned_time DESC').all({});
        return rows.map(r => (typeof r.id === 'bigint' ? Number(r.id) : r.id));
    }

    async function checkBans(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return [];
        const conn = await connect();
        const placeholders = ids.map(() => '?').join(',');
        const rows = conn.prepare(`SELECT id FROM comic_ban WHERE id IN (${placeholders})`).all(ids);
        return rows.map(r => (typeof r.id === 'bigint' ? Number(r.id) : r.id));
    }

    async function toggleBan(comicId) {
        const existing = await addBan(comicId);
        if (existing) return true;
        await removeBan(comicId);
        return false;
    }

    const comicBan = {
        addBan,
        removeBan,
        listBans,
        checkBans,
        toggleBan,
    };

    async function runLocal2Db() {
        let startTime = new Date().getTime();
        message?.onMessage({
            phase: PHASE.SYNC_LOCAL_TO_DB,
            state: STATE.START,
            startTime,
            complete: 0,
            total: 0
        });
        const infoDir = path.join(config.dataDir, 'info');
        const files = listFiles(infoDir)
            .filter((f) => f.endsWith('.json'));
        let imported = 0;
        await saveOrUpdateBatch(files, async (file) => {
            try {
                let number = Number.parseInt(getBaseName(file));
                let info = JSON.parse(fs.readFileSync(file, 'utf-8'));
                if (!info) {
                    return null;
                }
                return jsonRowToDb(info);
            } catch (e) {
                message?.onMessage({
                    phase: PHASE.SYNC_LOCAL_TO_DB,
                    state: STATE.ERROR,
                    startTime,
                    error: e
                });
                return null;
            } finally {
                imported += 1;
                message?.onMessage({
                    phase: PHASE.SYNC_LOCAL_TO_DB,
                    state: STATE.RUNNING,
                    startTime,
                    complete: imported,
                    total: files.length
                });
            }
        });
        message?.onMessage({
            phase: PHASE.SYNC_LOCAL_TO_DB,
            state: STATE.SUCCESS,
            startTime,
            endTime: new Date().getTime(),
            complete: files.length,
            total: files.length
        });
        return imported;
    }

    async function runDb2Local() {
        let startTime = new Date().getTime();
        message?.onMessage({
            phase: PHASE.SYNC_DB_TO_LOCAL,
            state: STATE.START,
            startTime,
            complete: 0,
            total: 0
        });
        const infoDir = path.join(config.dataDir, 'info');
        mkdirSyncIfNotExists(infoDir);
        const rows = (await comicMeta.list()) || [];
        let imported = 0;
        for (const row of rows) {
            try {
                writeToFileSync(
                    path.join(infoDir, `${row.id}.json`),
                    JSON.stringify(dbRowToJson(row), null, 2),
                );
            } catch (e) {
                message?.onMessage({
                    phase: PHASE.SYNC_DB_TO_LOCAL,
                    state: STATE.ERROR,
                    startTime,
                    error: e
                });
            } finally {
                imported += 1;
                message?.onMessage({
                    phase: PHASE.SYNC_DB_TO_LOCAL,
                    state: STATE.RUNNING,
                    startTime,
                    complete: imported,
                    total: rows.length
                });
            }
        }
        message?.onMessage({
            phase: PHASE.SYNC_DB_TO_LOCAL,
            state: STATE.SUCCESS,
            startTime,
            endTime: new Date().getTime(),
            complete: rows.length,
            total: rows.length
        });
        return rows.length;
    }

    function close() {
        if (database) {
            try {
                database.close();
            } catch {
                /* */
            }
            database = null;
        }
    }

    return {
        jsonRowToDb,
        dbRowToJson,
        connect,
        saveOrUpdate,
        saveOrUpdateBatch,
        has,
        get,
        listAllComic: list,
        listAllTags: listTags,
        pageComic: page,
        comicMeta,
        comicRead,
        comicBan,
        runLocal2Db,
        runDb2Local,
        close
    }
}

module.exports = {
    createStore
}
