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
        await database.exec(`
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
        try { await database.exec('ALTER TABLE comic_meta ADD COLUMN create_time INTEGER'); } catch (_) {}
        try { await database.exec('ALTER TABLE comic_meta ADD COLUMN update_time INTEGER'); } catch (_) {}
        // 索引 — WHERE 过滤
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_series_id ON comic_meta(series_id)'); } catch (_) {}
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_name ON comic_meta(name)'); } catch (_) {}
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_author ON comic_meta(author)'); } catch (_) {}
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_comment_total ON comic_meta(comment_total)'); } catch (_) {}
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_price ON comic_meta(price)'); } catch (_) {}
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_purchased ON comic_meta(purchased)'); } catch (_) {}
        // 复合排序索引 — 让 ORDER BY + LIMIT 直接走索引扫描
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_update ON comic_meta(update_time, id)'); } catch (_) {}
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_create ON comic_meta(create_time, id)'); } catch (_) {}
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_views ON comic_meta(total_views, id)'); } catch (_) {}
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_likes ON comic_meta(likes, id)'); } catch (_) {}
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_name ON comic_meta(name, id)'); } catch (_) {}
        try { await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_sort_addtime ON comic_meta(addtime, id)'); } catch (_) {}
        // 删除旧 FTS 表/触发器（已弃用，改用 LIKE）
        try {
            await database.exec('DROP TABLE IF EXISTS comic_meta_fts');
        } catch (_) {}
        try { await database.exec('DROP TRIGGER IF EXISTS comic_meta_fts_ai'); } catch (_) {}
        try { await database.exec('DROP TRIGGER IF EXISTS comic_meta_fts_ad'); } catch (_) {}
        try { await database.exec('DROP TRIGGER IF EXISTS comic_meta_fts_au'); } catch (_) {}
        await database.exec(`
      CREATE TABLE IF NOT EXISTS comic_read (
        id INTEGER PRIMARY KEY,
        read_time INTEGER NOT NULL DEFAULT (strftime('%s','now'))
      );
    `);
        await database.exec(`
      CREATE TABLE IF NOT EXISTS comic_ban (
        id INTEGER PRIMARY KEY,
        banned_time INTEGER NOT NULL DEFAULT (strftime('%s','now'))
      );
    `);
        await database.exec(`
      CREATE TABLE IF NOT EXISTS comic_star (
        id INTEGER PRIMARY KEY,
        star_time INTEGER NOT NULL DEFAULT (strftime('%s','now'))
      );
    `);
        // 标签关联表（代替 json_each 全表扫描）
        await database.exec(`
            CREATE TABLE IF NOT EXISTS comic_meta_tag (
                comic_id INTEGER NOT NULL,
                tag TEXT NOT NULL,
                PRIMARY KEY (comic_id, tag)
            )
        `);
        await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_tag_tag ON comic_meta_tag(tag)');
        await database.exec(`DROP TRIGGER IF EXISTS comic_meta_tag_ai`);
        await database.exec(`DROP TRIGGER IF EXISTS comic_meta_tag_au`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_tag_ai AFTER INSERT ON comic_meta BEGIN
            INSERT OR IGNORE INTO comic_meta_tag(comic_id, tag)
            SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.tags) THEN new.tags ELSE '[]' END) t;
        END`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_tag_au AFTER UPDATE ON comic_meta BEGIN
            DELETE FROM comic_meta_tag WHERE comic_id = old.id;
            INSERT OR IGNORE INTO comic_meta_tag(comic_id, tag)
            SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.tags) THEN new.tags ELSE '[]' END) t;
        END`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_tag_ad AFTER DELETE ON comic_meta BEGIN
            DELETE FROM comic_meta_tag WHERE comic_id = old.id;
        END`);
        // 自动同步标签表：已有数据但关联表为空
        try {
            const tagCount = (await database.prepare('SELECT COUNT(*) as c FROM comic_meta_tag').get({})).c;
            if (tagCount === 0) {
                await database.exec(`INSERT OR IGNORE INTO comic_meta_tag(comic_id, tag)
                    SELECT DISTINCT c.id, t.value FROM comic_meta c, json_each(CASE WHEN json_valid(c.tags) THEN c.tags ELSE '[]' END) t`);
            }
        } catch (_) {}
        // 作者关联表（代替 json_each 全表扫描）
        await database.exec(`
            CREATE TABLE IF NOT EXISTS comic_meta_author (
                comic_id INTEGER NOT NULL,
                author TEXT NOT NULL,
                PRIMARY KEY (comic_id, author)
            )
        `);
        await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_author_value ON comic_meta_author(author)');
        await database.exec(`DROP TRIGGER IF EXISTS comic_meta_author_ai`);
        await database.exec(`DROP TRIGGER IF EXISTS comic_meta_author_au`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_author_ai AFTER INSERT ON comic_meta BEGIN
            INSERT OR IGNORE INTO comic_meta_author(comic_id, author)
            SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.author) THEN new.author ELSE '[]' END) t;
        END`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_author_au AFTER UPDATE ON comic_meta BEGIN
            DELETE FROM comic_meta_author WHERE comic_id = old.id;
            INSERT OR IGNORE INTO comic_meta_author(comic_id, author)
            SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.author) THEN new.author ELSE '[]' END) t;
        END`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_author_ad AFTER DELETE ON comic_meta BEGIN
            DELETE FROM comic_meta_author WHERE comic_id = old.id;
        END`);
        // 自动同步作者表：已有数据但关联表为空
        try {
            const authorCount = (await database.prepare('SELECT COUNT(*) as c FROM comic_meta_author').get({})).c;
            if (authorCount === 0) {
                await database.exec(`INSERT OR IGNORE INTO comic_meta_author(comic_id, author)
                    SELECT DISTINCT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.author) THEN c.author ELSE '[]' END) t`);
            }
        } catch (_) {}
        // 作品关联表
        await database.exec(`
            CREATE TABLE IF NOT EXISTS comic_work (
                comic_id INTEGER NOT NULL,
                work TEXT NOT NULL,
                PRIMARY KEY (comic_id, work)
            )
        `);
        await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_work_value ON comic_work(work)');
        await database.exec(`DROP TRIGGER IF EXISTS comic_work_ai`);
        await database.exec(`DROP TRIGGER IF EXISTS comic_work_au`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_work_ai AFTER INSERT ON comic_meta BEGIN
            INSERT OR IGNORE INTO comic_work(comic_id, work)
            SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.works) THEN new.works ELSE '[]' END) t;
        END`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_work_au AFTER UPDATE ON comic_meta BEGIN
            DELETE FROM comic_work WHERE comic_id = old.id;
            INSERT OR IGNORE INTO comic_work(comic_id, work)
            SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.works) THEN new.works ELSE '[]' END) t;
        END`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_work_ad AFTER DELETE ON comic_meta BEGIN
            DELETE FROM comic_work WHERE comic_id = old.id;
        END`);
        try {
            const workCount = (await database.prepare('SELECT COUNT(*) as c FROM comic_work').get({})).c;
            if (workCount === 0) {
                await database.exec(`INSERT OR IGNORE INTO comic_work(comic_id, work)
                    SELECT DISTINCT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.works) THEN c.works ELSE '[]' END) t`);
            }
        } catch (_) {}
        // 作品关联表
        await database.exec(`
            CREATE TABLE IF NOT EXISTS comic_work (
                comic_id INTEGER NOT NULL,
                work TEXT NOT NULL,
                PRIMARY KEY (comic_id, work)
            )
        `);
        await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_work_value ON comic_work(work)');
        await database.exec(`DROP TRIGGER IF EXISTS comic_work_ai`);
        await database.exec(`DROP TRIGGER IF EXISTS comic_work_au`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_work_ai AFTER INSERT ON comic_meta BEGIN
            INSERT OR IGNORE INTO comic_work(comic_id, work)
            SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.works) THEN new.works ELSE '[]' END) t;
        END`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_work_au AFTER UPDATE ON comic_meta BEGIN
            DELETE FROM comic_work WHERE comic_id = old.id;
            INSERT OR IGNORE INTO comic_work(comic_id, work)
            SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.works) THEN new.works ELSE '[]' END) t;
        END`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_work_ad AFTER DELETE ON comic_meta BEGIN
            DELETE FROM comic_work WHERE comic_id = old.id;
        END`);
        try {
            const workCount = (await database.prepare('SELECT COUNT(*) as c FROM comic_work').get({})).c;
            if (workCount === 0) {
                await database.exec(`INSERT OR IGNORE INTO comic_work(comic_id, work)
                    SELECT DISTINCT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.works) THEN c.works ELSE '[]' END) t`);
            }
        } catch (_) {}
        // 登场人物关联表
        await database.exec(`
            CREATE TABLE IF NOT EXISTS comic_meta_actor (
                comic_id INTEGER NOT NULL,
                actor TEXT NOT NULL,
                PRIMARY KEY (comic_id, actor)
            )
        `);
        await database.exec('CREATE INDEX IF NOT EXISTS idx_meta_actor_value ON comic_meta_actor(actor)');
        await database.exec(`DROP TRIGGER IF EXISTS comic_meta_actor_ai`);
        await database.exec(`DROP TRIGGER IF EXISTS comic_meta_actor_au`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_actor_ai AFTER INSERT ON comic_meta BEGIN
            INSERT OR IGNORE INTO comic_meta_actor(comic_id, actor)
            SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.actors) THEN new.actors ELSE '[]' END) t;
        END`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_actor_au AFTER UPDATE ON comic_meta BEGIN
            DELETE FROM comic_meta_actor WHERE comic_id = old.id;
            INSERT OR IGNORE INTO comic_meta_actor(comic_id, actor)
            SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.actors) THEN new.actors ELSE '[]' END) t;
        END`);
        await database.exec(`CREATE TRIGGER IF NOT EXISTS comic_meta_actor_ad AFTER DELETE ON comic_meta BEGIN
            DELETE FROM comic_meta_actor WHERE comic_id = old.id;
        END`);
        try {
            const actorCount = (await database.prepare('SELECT COUNT(*) as c FROM comic_meta_actor').get({})).c;
            if (actorCount === 0) {
                await database.exec(`INSERT OR IGNORE INTO comic_meta_actor(comic_id, actor)
                    SELECT DISTINCT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.actors) THEN c.actors ELSE '[]' END) t`);
            }
        } catch (_) {}
        return database;
    }

    async function saveOrUpdateBatch(anyList, toRow) {
        let conn = await connect();
        await conn.exec('BEGIN TRANSACTION');
        const stmt = conn.prepare(insertSQl);
        for (let obj of anyList) {
            let row = await toRow(obj);
            if (row) await stmt.run(row);
        }
        await conn.exec('COMMIT');
    }

    async function saveOrUpdate(row) {
        let conn = await connect();
        const stmt = conn.prepare(insertSQl);
        await stmt.run(row);
    }

    // ============ comicMeta sub-module ============

    async function has(id) {
        let conn = await connect();
        let total = (await conn.prepare('SELECT COUNT(1) as c FROM comic_meta WHERE id = ?').get(id)).c;
        return total !== 0;
    }

    async function get(id) {
        let conn = await connect();
        return await conn.prepare('SELECT * FROM comic_meta WHERE id = ?').get(id);
    }

    async function list() {
        let conn = await connect();
        return await conn.prepare('SELECT * FROM comic_meta').all({});
    }

    async function listTags(query) {
        if (!query) return [];
        const conn = await connect();
        const rows = await conn.prepare('SELECT DISTINCT tag FROM comic_meta_tag WHERE tag LIKE ? AND tag != \'\' LIMIT 100').all(`%${query}%`);
        return rows.map(r => r.tag);
    }

    async function syncAllTags() {
        const conn = await connect();
        await conn.exec('DELETE FROM comic_meta_tag');
        await conn.exec(`INSERT OR IGNORE INTO comic_meta_tag(comic_id, tag)
            SELECT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.tags) THEN c.tags ELSE '[]' END) t`);
    }

    async function syncAllAuthors() {
        const conn = await connect();
        await conn.exec('DELETE FROM comic_meta_author');
        await conn.exec(`INSERT OR IGNORE INTO comic_meta_author(comic_id, author)
            SELECT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.author) THEN c.author ELSE '[]' END) t`);
    }

    async function listWorks(query) {
        const conn = await connect();
        let rows;
        if (query) {
            rows = await conn.prepare('SELECT DISTINCT work FROM comic_work WHERE work LIKE ? AND work != \'\' ORDER BY work LIMIT 100').all(`%${query}%`);
        } else {
            rows = await conn.prepare('SELECT DISTINCT work FROM comic_work WHERE work != \'\' ORDER BY work').all({});
        }
        return rows.map(r => r.work);
    }

    async function syncAllWorks() {
        const conn = await connect();
        await conn.exec('DELETE FROM comic_work');
        await conn.exec(`INSERT OR IGNORE INTO comic_work(comic_id, work)
            SELECT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.works) THEN c.works ELSE '[]' END) t`);
    }

    async function listActors(query) {
        if (!query) return [];
        const conn = await connect();
        const rows = await conn.prepare('SELECT DISTINCT actor FROM comic_meta_actor WHERE actor LIKE ? AND actor != \'\' LIMIT 100').all(`%${query}%`);
        return rows.map(r => r.actor);
    }

    async function syncAllActors() {
        const conn = await connect();
        await conn.exec('DELETE FROM comic_meta_actor');
        await conn.exec(`INSERT OR IGNORE INTO comic_meta_actor(comic_id, actor)
            SELECT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.actors) THEN c.actors ELSE '[]' END) t`);
    }

    async function page(qo) {
        const conn = await connect();
        const { name, author, id, tags, works, actors, kind, banned, starred, sort, order, page, pageSize, availDir } = qo;

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
            parts.push('comic_meta.id IN (SELECT id FROM comic_ban)');
        } else {
            parts.push('comic_meta.id NOT IN (SELECT id FROM comic_ban)');
        }
        if (starred === 'true') {
            parts.push('comic_meta.id IN (SELECT id FROM comic_star)');
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
        // 严格匹配 works（多个逗号分隔，AND 语义）
        if (works) {
            works.split(',').filter(Boolean).forEach((w, i) => {
                parts.push(`EXISTS (SELECT 1 FROM comic_work WHERE comic_id = comic_meta.id AND work = @work${i})`);
                params[`work${i}`] = w.trim();
            });
        }
        // 严格匹配 actors（多个逗号分隔，AND 语义）
        if (actors) {
            actors.split(',').filter(Boolean).forEach((a, i) => {
                parts.push(`EXISTS (SELECT 1 FROM comic_meta_actor WHERE comic_id = comic_meta.id AND actor = @actor${i})`);
                params[`actor${i}`] = a.trim();
            });
        }
        // 关键词 LIKE 匹配（name/author/tags）
        if (name) {
            parts.push('(name LIKE @kw OR author LIKE @kw OR tags LIKE @kw)');
            params.kw = `%${name}%`;
        }

        const where = parts.join(' AND ');
        const orderBy = sort || 'update_time';
        const orderDir = order === 'ASC' ? 'ASC' : 'DESC';

        const sql = 'SELECT * FROM comic_meta';
        const countSQL = `SELECT COUNT(*) as c FROM (${sql} WHERE ${where})`;
        const dataSQL = `${sql} WHERE ${where} ORDER BY ${orderBy} ${orderDir} LIMIT @lim OFFSET @off`;
        console.log('[store]', countSQL, JSON.stringify(params));
        const total = (await conn.prepare(countSQL).get(params)).c;
        console.log('[store]', dataSQL, JSON.stringify({ ...params, lim: pageSize, off: (page - 1) * pageSize }));
        const rows = await conn.prepare(dataSQL).all({ ...params, lim: pageSize, off: (page - 1) * pageSize });
        return { total, rows };
    }

    const comicMeta = {
        has,
        get,
        list,
        listTags,
        listWorks,
        listActors,
        page,
        syncAllTags,
        syncAllAuthors,
        syncAllWorks,
        syncAllActors,
        saveOrUpdate,
        saveOrUpdateBatch,
    };

    // ============ comicRead sub-module ============

    async function saveRead(episodeId) {
        const conn = await connect();
        const existing = await conn.prepare('SELECT id FROM comic_read WHERE id = ?').get(episodeId);
        if (existing) return;
        await conn.prepare('INSERT INTO comic_read (id) VALUES (?)').run(episodeId);
    }

    async function checkReads(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return [];
        const conn = await connect();
        const placeholders = ids.map(() => '?').join(',');
        const rows = await conn.prepare(`SELECT id FROM comic_read WHERE id IN (${placeholders})`).all(ids);
        return rows.map(r => (typeof r.id === 'bigint' ? Number(r.id) : r.id));
    }

    const comicRead = {
        saveRead,
        checkReads,
    };

    // ============ comicBan sub-module ============

    async function addBan(comicId) {
        const conn = await connect();
        const existing = await conn.prepare('SELECT id FROM comic_ban WHERE id = ?').get(comicId);
        if (existing) return false;
        await conn.prepare('INSERT INTO comic_ban (id) VALUES (?)').run(comicId);
        return true;
    }

    async function removeBan(comicId) {
        const conn = await connect();
        const existing = await conn.prepare('SELECT id FROM comic_ban WHERE id = ?').get(comicId);
        if (!existing) return false;
        await conn.prepare('DELETE FROM comic_ban WHERE id = ?').run(comicId);
        return true;
    }

    async function listBans() {
        const conn = await connect();
        const rows = await conn.prepare('SELECT id FROM comic_ban ORDER BY banned_time DESC').all({});
        return rows.map(r => (typeof r.id === 'bigint' ? Number(r.id) : r.id));
    }

    async function checkBans(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return [];
        const conn = await connect();
        const placeholders = ids.map(() => '?').join(',');
        const rows = await conn.prepare(`SELECT id FROM comic_ban WHERE id IN (${placeholders})`).all(ids);
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

    // ============ comicStar sub-module ============

    async function addStar(comicId) {
        const conn = await connect();
        const existing = await conn.prepare('SELECT id FROM comic_star WHERE id = ?').get(comicId);
        if (existing) return false;
        await conn.prepare('INSERT INTO comic_star (id) VALUES (?)').run(comicId);
        return true;
    }

    async function removeStar(comicId) {
        const conn = await connect();
        const existing = await conn.prepare('SELECT id FROM comic_star WHERE id = ?').get(comicId);
        if (!existing) return false;
        await conn.prepare('DELETE FROM comic_star WHERE id = ?').run(comicId);
        return true;
    }

    async function listStars() {
        const conn = await connect();
        const rows = await conn.prepare('SELECT id FROM comic_star ORDER BY star_time DESC').all({});
        return rows.map(r => (typeof r.id === 'bigint' ? Number(r.id) : r.id));
    }

    async function checkStars(ids) {
        if (!Array.isArray(ids) || ids.length === 0) return [];
        const conn = await connect();
        const placeholders = ids.map(() => '?').join(',');
        const rows = await conn.prepare(`SELECT id FROM comic_star WHERE id IN (${placeholders})`).all(ids);
        return rows.map(r => (typeof r.id === 'bigint' ? Number(r.id) : r.id));
    }

    async function toggleStar(comicId) {
        const existing = await addStar(comicId);
        if (existing) return true;
        await removeStar(comicId);
        return false;
    }

    const comicStar = {
        addStar,
        removeStar,
        listStars,
        checkStars,
        toggleStar,
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

    async function close() {
        if (database) {
            try {
                await database.close();
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
        listAllWorks: listWorks,
        listAllActors: listActors,
        pageComic: page,
        comicMeta,
        comicRead,
        comicBan,
        comicStar,
        runLocal2Db,
        runDb2Local,
        close
    }
}

module.exports = {
    createStore
}
