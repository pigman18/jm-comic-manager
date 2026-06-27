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
            // 检查 schema 版本（v2: content='comic_meta' 已移除, author/tags 标准化存储）
            const currentVersion = (() => {
                try {
                    const row = database.prepare('PRAGMA user_version').get();
                    if (typeof row === 'object' && row) {
                        return Number(row.user_version || row['user_version'] || 0);
                    }
                    return Number(row) || 0;
                } catch (_) { return 0; }
            })();
            // 旧版 FTS（content='comic_meta'）迁移：删除后重新创建
            if (currentVersion < 2) {
                database.exec('DROP TABLE IF EXISTS comic_meta_fts');
                database.exec('DROP TRIGGER IF EXISTS comic_meta_ai');
                database.exec('DROP TRIGGER IF EXISTS comic_meta_ad');
                database.exec('DROP TRIGGER IF EXISTS comic_meta_au');
            }
            // 检查 FTS 表是否已有正确列
            const recreateFts = (() => {
                try {
                    database.exec('SELECT tags FROM comic_meta_fts LIMIT 0');
                    return false;
                } catch (_) {
                    database.exec('DROP TABLE IF EXISTS comic_meta_fts');
                    return true;
                }
            })();
            // 不再使用 content='comic_meta'，手动管理标准化数据
            database.exec(`CREATE VIRTUAL TABLE IF NOT EXISTS comic_meta_fts USING fts5(
                name, author, description, tags, works, actors,
                tokenize='unicode61'
            )`);
            if (recreateFts || currentVersion < 2) {
                database.exec(`INSERT OR IGNORE INTO comic_meta_fts(rowid, name, author, description, tags, works, actors)
                    SELECT id, name,
                        TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(comic_meta.author,'[]'),'[',''),']',''),'"',''),',',' ')),
                        description,
                        TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(comic_meta.tags,'[]'),'[',''),']',''),'"',''),',',' ')),
                        works, actors
                    FROM comic_meta`);
            }
            database.exec('DROP TRIGGER IF EXISTS comic_meta_fts_ai');
            database.exec('DROP TRIGGER IF EXISTS comic_meta_fts_ad');
            database.exec('DROP TRIGGER IF EXISTS comic_meta_fts_au');
            database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_fts_ai AFTER INSERT ON comic_meta BEGIN
                INSERT INTO comic_meta_fts(rowid, name, author, description, tags, works, actors)
                VALUES (
                    new.id, new.name,
                    TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(new.author,'[]'),'[',''),']',''),'"',''),',',' ')),
                    new.description,
                    TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(new.tags,'[]'),'[',''),']',''),'"',''),',',' ')),
                    new.works, new.actors
                );
            END`);
            database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_fts_ad AFTER DELETE ON comic_meta BEGIN
                DELETE FROM comic_meta_fts WHERE rowid = old.id;
            END`);
            database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_fts_au AFTER UPDATE ON comic_meta BEGIN
                DELETE FROM comic_meta_fts WHERE rowid = old.id;
                INSERT INTO comic_meta_fts(rowid, name, author, description, tags, works, actors)
                VALUES (
                    new.id, new.name,
                    TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(new.author,'[]'),'[',''),']',''),'"',''),',',' ')),
                    new.description,
                    TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(new.tags,'[]'),'[',''),']',''),'"',''),',',' ')),
                    new.works, new.actors);
            END`);
            if (currentVersion < 2) {
                database.exec('PRAGMA user_version = 2');
            }
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
        database.exec(`DROP TRIGGER IF EXISTS comic_meta_tag_ai`);
        database.exec(`DROP TRIGGER IF EXISTS comic_meta_tag_au`);
        database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_tag_ai AFTER INSERT ON comic_meta BEGIN
            INSERT OR IGNORE INTO comic_meta_tag(comic_id, tag)
            SELECT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.tags) THEN new.tags ELSE '[]' END) t;
        END`);
        database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_tag_au AFTER UPDATE ON comic_meta BEGIN
            DELETE FROM comic_meta_tag WHERE comic_id = old.id;
            INSERT OR IGNORE INTO comic_meta_tag(comic_id, tag)
            SELECT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.tags) THEN new.tags ELSE '[]' END) t;
        END`);
        database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_tag_ad AFTER DELETE ON comic_meta BEGIN
            DELETE FROM comic_meta_tag WHERE comic_id = old.id;
        END`);
        // 自动同步标签表：已有数据但关联表为空
        try {
            const tagCount = database.prepare('SELECT COUNT(*) as c FROM comic_meta_tag').get({}).c;
            if (tagCount === 0) {
                database.exec(`INSERT OR IGNORE INTO comic_meta_tag(comic_id, tag)
                    SELECT c.id, t.value FROM comic_meta c, json_each(CASE WHEN json_valid(c.tags) THEN c.tags ELSE '[]' END) t`);
            }
        } catch (_) {}
        // 作者关联表（代替 json_each 全表扫描）
        database.exec(`
            CREATE TABLE IF NOT EXISTS comic_meta_author (
                comic_id INTEGER NOT NULL,
                author TEXT NOT NULL,
                PRIMARY KEY (comic_id, author)
            )
        `);
        database.exec('CREATE INDEX IF NOT EXISTS idx_meta_author_value ON comic_meta_author(author)');
        database.exec(`DROP TRIGGER IF EXISTS comic_meta_author_ai`);
        database.exec(`DROP TRIGGER IF EXISTS comic_meta_author_au`);
        database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_author_ai AFTER INSERT ON comic_meta BEGIN
            INSERT OR IGNORE INTO comic_meta_author(comic_id, author)
            SELECT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.author) THEN new.author ELSE '[]' END) t;
        END`);
        database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_author_au AFTER UPDATE ON comic_meta BEGIN
            DELETE FROM comic_meta_author WHERE comic_id = old.id;
            INSERT OR IGNORE INTO comic_meta_author(comic_id, author)
            SELECT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.author) THEN new.author ELSE '[]' END) t;
        END`);
        database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_author_ad AFTER DELETE ON comic_meta BEGIN
            DELETE FROM comic_meta_author WHERE comic_id = old.id;
        END`);
        // 自动同步作者表：已有数据但关联表为空
        try {
            const authorCount = database.prepare('SELECT COUNT(*) as c FROM comic_meta_author').get({}).c;
            if (authorCount === 0) {
                database.exec(`INSERT OR IGNORE INTO comic_meta_author(comic_id, author)
                    SELECT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.author) THEN c.author ELSE '[]' END) t`);
            }
        } catch (_) {}
        // 自动重建 FTS：已有数据但 FTS 表为空
        try {
            const ftsCount = database.prepare('SELECT COUNT(*) as c FROM comic_meta_fts').get({}).c;
            if (ftsCount === 0) {
                database.exec(`INSERT OR IGNORE INTO comic_meta_fts(rowid, name, author, description, tags, works, actors)
                    SELECT id, name,
                        TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(comic_meta.author,'[]'),'[',''),']',''),'"',''),',',' ')),
                        description,
                        TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(comic_meta.tags,'[]'),'[',''),']',''),'"',''),',',' ')),
                        works, actors
                    FROM comic_meta`);
            }
        } catch (_) {}
        return database;
    }

    async function saveOrUpdateBatch(anyList, toRow) {
        let conn = await connect();
        conn.exec('BEGIN TRANSACTION');
        const stmt = conn.prepare(insertSQl);
        for (let obj of anyList) {
            let row = await toRow(obj);
            if (row) stmt.run(row);
        }
        conn.exec('COMMIT');
    }

    async function saveOrUpdate(row) {
        let conn = await connect();
        const stmt = conn.prepare(insertSQl);
        stmt.run(row);
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
            SELECT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.tags) THEN c.tags ELSE '[]' END) t`);
    }

    async function syncAllAuthors() {
        const conn = await connect();
        conn.exec('DELETE FROM comic_meta_author');
        conn.exec(`INSERT OR IGNORE INTO comic_meta_author(comic_id, author)
            SELECT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.author) THEN c.author ELSE '[]' END) t`);
    }

    function makeFtsTerms(value) {
        const words = value.match(/\S+/gu);
        if (!words || !words.length) return [];
        return words.map(w => `${w}*`);
    }

    async function rebuildFtsIndex() {
        const conn = await connect();
        try {
            conn.exec('DELETE FROM comic_meta_fts');
            conn.exec(`INSERT INTO comic_meta_fts(rowid, name, author, description, tags, works, actors)
                SELECT id, name,
                    TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(comic_meta.author,'[]'),'[',''),']',''),'"',''),',',' ')),
                    description,
                    TRIM(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(comic_meta.tags,'[]'),'[',''),']',''),'"',''),',',' ')),
                    works, actors
                FROM comic_meta`);
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

        // 严格匹配 author（多个逗号分隔，AND 语义）
        if (author) {
            author.split(',').filter(Boolean).forEach((a, i) => {
                parts.push(`EXISTS (SELECT 1 FROM comic_meta_author WHERE comic_id = comic_meta.id AND author = @author${i})`);
                params[`author${i}`] = a.trim();
            });
        }
        // 严格匹配 tags（多个逗号分隔，AND 语义）
        if (tags) {
            tags.split(',').filter(Boolean).forEach((t, i) => {
                parts.push(`EXISTS (SELECT 1 FROM comic_meta_tag WHERE comic_id = comic_meta.id AND tag = @tag${i})`);
                params[`tag${i}`] = t.trim();
            });
        }

        const where = parts.join(' AND ');
        const orderBy = sort || 'update_time';
        const orderDir = order === 'ASC' ? 'ASC' : 'DESC';

        if (name) {
            const ftsTerms = makeFtsTerms(name);
            if (ftsTerms.length) {
                params.ftsMatch = ftsTerms.join(' AND ');
                const ftsSQL = 'SELECT comic_meta.* FROM comic_meta INNER JOIN comic_meta_fts ON comic_meta.id = comic_meta_fts.rowid';
                const ftsWhere = `comic_meta_fts MATCH @ftsMatch AND ${where}`;
                const total = conn.prepare(`SELECT COUNT(*) as c FROM (${ftsSQL} WHERE ${ftsWhere})`).get(params).c;
                const rows = conn.prepare(`${ftsSQL} WHERE ${ftsWhere} ORDER BY ${orderBy} ${orderDir} LIMIT @lim OFFSET @off`).all({ ...params, lim: pageSize, off: (page - 1) * pageSize });
                return { total, rows };
            }
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
        syncAllAuthors,
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
