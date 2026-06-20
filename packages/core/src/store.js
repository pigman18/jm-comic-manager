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
            tags: JSON.stringify(obj.tags || []),
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
        // 索引
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_series_id ON comic_meta(series_id)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_name ON comic_meta(name)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_author ON comic_meta(author)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_addtime ON comic_meta(addtime)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_total_views ON comic_meta(total_views)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_likes ON comic_meta(likes)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_comment_total ON comic_meta(comment_total)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_liked ON comic_meta(liked)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_is_favorite ON comic_meta(is_favorite)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_is_aids ON comic_meta(is_aids)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_price ON comic_meta(price)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_purchased ON comic_meta(purchased)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_update_time ON comic_meta(update_time)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_create_time ON comic_meta(create_time)'); } catch (_) {}
        try { database.exec('CREATE INDEX IF NOT EXISTS idx_meta_tags ON comic_meta(tags)'); } catch (_) {}
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
        return database;
    }

    async function saveOrUpdateBatch(anyList, toRow) {
        let conn = await connect();
        conn.exec('BEGIN TRANSACTION');
        const stmt = conn.prepare(insertSQl);
        for (let obj of anyList) {
            let row = await toRow(obj);
            if (row) {
                stmt.run(row);
            }
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
        const sql = `
      SELECT DISTINCT t.value AS tag
      FROM comic_meta c, json_each(c.tags) t
      WHERE t.value LIKE ?
      LIMIT 100
    `;
        const rows = await conn.prepare(sql).all(`%${query}%`);
        return rows.map(r => r.tag);
    }

    async function page(params, pageNum, pageSize, where, orderBy, orderBySeq) {
        let conn = await connect();
        let total = conn.prepare(`SELECT COUNT(*) as c FROM comic_meta ${where}`).get(params).c;
        let rows = conn
            .prepare(
                `SELECT * FROM comic_meta ${where} ORDER BY ${orderBy} ${orderBySeq} LIMIT @lim OFFSET @off`,
            )
            .all({...params, lim: pageSize, off: (pageNum - 1) * pageSize});
        return {total, rows};
    }

    const comicMeta = {
        has,
        get,
        list,
        listTags,
        page,
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
        const numbers = listFiles(infoDir)
            .filter((f) => f.endsWith('.json'))
            .map((file) => Number.parseInt(getBaseName(file)));
        let imported = 0;
        await saveOrUpdateBatch(numbers, async (number) => {
            try {
                let info = await crawler.comic.getMeta(number);
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
                    total: numbers.length
                });
            }
        });
        message?.onMessage({
            phase: PHASE.SYNC_LOCAL_TO_DB,
            state: STATE.SUCCESS,
            startTime,
            endTime: new Date().getTime(),
            complete: numbers.length,
            total: numbers.length
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

    async function close() {
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
