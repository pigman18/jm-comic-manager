'use strict';

/**
 * 数据库迁移
 *
 * 设计约束（重要）：
 * 1、用户库实测 5.6 GB / 100 万+ 条 comic_meta，**禁止任何全表重写**（UPDATE 全表、重建表、VACUUM 等）
 * 2、每条迁移必须幂等（用 IF NOT EXISTS / 先探测再执行）
 * 3、版本号存于 PRAGMA user_version，迁移按编号顺序执行，只前进不回退
 * 4、单条迁移失败时整体中止并保留错误，绝不"跳过继续"
 *
 * 新增迁移：在 MIGRATIONS 末尾追加 { version, name, up(db) }，
 * version 必须严格递增，且已发布的迁移不可修改。
 *
 * ⚠️ 版本号起点说明：
 * 历史版本（1.0.2 及更早）曾把 PRAGMA user_version 写成 2，但当时并没有迁移体系，
 * 2 并不代表任何真实结构版本。为避免"库版本(2) 高于代码版本(1) → 跳过迁移"导致
 * 老用户永远拿不到后续迁移，本体系从 **3** 开始编号。
 */

/** 迁移编号起点：避开历史遗留的 user_version=2 */
const BASELINE_VERSION = 3;

/** @typedef {{version:number, name:string, up:(db:any)=>Promise<void>}} Migration */

/** @type {Migration[]} */
const MIGRATIONS = [
    {
        version: BASELINE_VERSION,
        name: 'baseline：表结构 + 索引 + 关联表触发器（幂等补齐）',
        async up(db) {
            // 基础表
            await db.exec(`
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
            await db.exec(`
                CREATE TABLE IF NOT EXISTS comic_read (
                    id INTEGER PRIMARY KEY,
                    read_time INTEGER NOT NULL DEFAULT (strftime('%s','now'))
                );
            `);
            await db.exec(`
                CREATE TABLE IF NOT EXISTS comic_ban (
                    id INTEGER PRIMARY KEY,
                    banned_time INTEGER NOT NULL DEFAULT (strftime('%s','now'))
                );
            `);
            await db.exec(`
                CREATE TABLE IF NOT EXISTS comic_star (
                    id INTEGER PRIMARY KEY,
                    star_time INTEGER NOT NULL DEFAULT (strftime('%s','now'))
                );
            `);

            // 列（老库可能缺 create_time / update_time）——ADD COLUMN 是 O(1) 元数据操作
            await addColumnIfMissing(db, 'comic_meta', 'create_time', 'INTEGER');
            await addColumnIfMissing(db, 'comic_meta', 'update_time', 'INTEGER');

            // 索引
            const indexes = [
                'CREATE INDEX IF NOT EXISTS idx_meta_series_id ON comic_meta(series_id)',
                'CREATE INDEX IF NOT EXISTS idx_meta_name ON comic_meta(name)',
                'CREATE INDEX IF NOT EXISTS idx_meta_author ON comic_meta(author)',
                'CREATE INDEX IF NOT EXISTS idx_meta_comment_total ON comic_meta(comment_total)',
                'CREATE INDEX IF NOT EXISTS idx_meta_price ON comic_meta(price)',
                'CREATE INDEX IF NOT EXISTS idx_meta_purchased ON comic_meta(purchased)',
                'CREATE INDEX IF NOT EXISTS idx_meta_sort_update ON comic_meta(update_time, id)',
                'CREATE INDEX IF NOT EXISTS idx_meta_sort_create ON comic_meta(create_time, id)',
                'CREATE INDEX IF NOT EXISTS idx_meta_sort_views ON comic_meta(total_views, id)',
                'CREATE INDEX IF NOT EXISTS idx_meta_sort_likes ON comic_meta(likes, id)',
                'CREATE INDEX IF NOT EXISTS idx_meta_sort_name ON comic_meta(name, id)',
                'CREATE INDEX IF NOT EXISTS idx_meta_sort_addtime ON comic_meta(addtime, id)',
            ];
            for (const sql of indexes) await db.exec(sql);

            // 清理历史 FTS 残留（旧版本遗留，已不再使用）
            await db.exec('DROP TABLE IF EXISTS comic_meta_fts');
            await db.exec('DROP TRIGGER IF EXISTS comic_meta_fts_ai');
            await db.exec('DROP TRIGGER IF EXISTS comic_meta_fts_ad');
            await db.exec('DROP TRIGGER IF EXISTS comic_meta_fts_au');

            // 关联表 + 触发器
            for (const spec of [
                {table: 'comic_meta_tag', column: 'tag', jsonColumn: 'tags', indexName: 'idx_meta_tag_tag'},
                {table: 'comic_meta_author', column: 'author', jsonColumn: 'author', indexName: 'idx_meta_author_value'},
                {table: 'comic_work', column: 'work', jsonColumn: 'works', indexName: 'idx_meta_work_value'},
                {table: 'comic_meta_actor', column: 'actor', jsonColumn: 'actors', indexName: 'idx_meta_actor_value'},
            ]) {
                await ensureAssocTable(db, spec);
            }
        },
    },
];

/** 读取某列是否存在 */
async function hasColumn(db, table, column) {
    try {
        const rows = await db.prepare(`PRAGMA table_info(${table})`).all({});
        return rows.some((r) => String(r.name) === column);
    } catch {
        return false;
    }
}

async function addColumnIfMissing(db, table, column, type) {
    if (await hasColumn(db, table, column)) return;
    await db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
}

/**
 * 创建关联表 + 索引 + 触发器 + 首次填充
 * 触发器统一用 INSERT OR IGNORE + SELECT DISTINCT，避免标签重复导致主键冲突
 * （1.0.2 修过的 1171888 重复 tag 问题即由此而来）
 */
async function ensureAssocTable(db, {table, column, jsonColumn, indexName}) {
    await db.exec(`
        CREATE TABLE IF NOT EXISTS ${table} (
            comic_id INTEGER NOT NULL,
            ${column} TEXT NOT NULL,
            PRIMARY KEY (comic_id, ${column})
        )
    `);
    await db.exec(`CREATE INDEX IF NOT EXISTS ${indexName} ON ${table}(${column})`);
    await db.exec(`DROP TRIGGER IF EXISTS ${table}_ai`);
    await db.exec(`DROP TRIGGER IF EXISTS ${table}_au`);
    await db.exec(`DROP TRIGGER IF EXISTS ${table}_ad`);
    await db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_ai AFTER INSERT ON comic_meta BEGIN
        INSERT OR IGNORE INTO ${table}(comic_id, ${column})
        SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.${jsonColumn}) THEN new.${jsonColumn} ELSE '[]' END) t;
    END`);
    await db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_au AFTER UPDATE ON comic_meta BEGIN
        DELETE FROM ${table} WHERE comic_id = old.id;
        INSERT OR IGNORE INTO ${table}(comic_id, ${column})
        SELECT DISTINCT new.id, TRIM(t.value) FROM json_each(CASE WHEN json_valid(new.${jsonColumn}) THEN new.${jsonColumn} ELSE '[]' END) t;
    END`);
    await db.exec(`CREATE TRIGGER IF NOT EXISTS ${table}_ad AFTER DELETE ON comic_meta BEGIN
        DELETE FROM ${table} WHERE comic_id = old.id;
    END`);

    // 首次填充：仅在表为空时执行（避免每次启动都全表扫描 5.6GB 库）
    try {
        const count = (await db.prepare(`SELECT COUNT(*) as c FROM ${table}`).get({})).c;
        if (Number(count) === 0) {
            await db.exec(`INSERT OR IGNORE INTO ${table}(comic_id, ${column})
                SELECT DISTINCT c.id, TRIM(t.value) FROM comic_meta c, json_each(CASE WHEN json_valid(c.${jsonColumn}) THEN c.${jsonColumn} ELSE '[]' END) t`);
        }
    } catch (_) { /* 填充失败不阻断启动，后续可通过 rebuild-cache 重建 */ }
}

/** 读取当前库版本 */
async function getSchemaVersion(db) {
    try {
        const row = await db.prepare('PRAGMA user_version').get({});
        const v = row ? (row.user_version ?? Object.values(row)[0]) : 0;
        return Number(v) || 0;
    } catch {
        return 0;
    }
}

/**
 * 执行所有未应用的迁移。
 * @param db  已连接的数据库
 * @param log 可选日志函数
 * @return {{from:number, to:number, applied:string[]}}
 */
async function migrate(db, log = () => {}) {
    const current = await getSchemaVersion(db);
    const target = MIGRATIONS.length ? MIGRATIONS[MIGRATIONS.length - 1].version : 0;

    // 库版本高于代码：只可能是用户降级了应用。
    // 不做任何 DDL（避免误伤新版本数据），仅告警。
    if (current > target) {
        log(`[db] 数据库版本(${current}) 高于代码(${target})，跳过迁移（可能是降级运行）`);
        return {from: current, to: current, applied: []};
    }

    const applied = [];
    for (const m of MIGRATIONS) {
        if (m.version <= current) continue;
        log(`[db] 迁移 ${m.version}: ${m.name}`);
        try {
            await m.up(db);
            // PRAGMA 不支持参数绑定，版本号来自代码常量，无注入风险
            await db.exec(`PRAGMA user_version = ${Number(m.version)}`);
            applied.push(`${m.version}:${m.name}`);
        } catch (e) {
            // 单条失败即中止，保留 user_version 在上一版，便于下次重试
            const err = new Error(`数据库迁移失败（v${m.version} ${m.name}）：${e.message || e}`);
            err.cause = e;
            throw err;
        }
    }

    const to = await getSchemaVersion(db);
    return {from: current, to, applied};
}

module.exports = {
    MIGRATIONS,
    migrate,
    getSchemaVersion,
    ensureAssocTable,
    hasColumn,
    addColumnIfMissing,
    TARGET_VERSION: MIGRATIONS.length ? MIGRATIONS[MIGRATIONS.length - 1].version : 0,
};
