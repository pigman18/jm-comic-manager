'use strict';
/**
 * 数据库迁移测试
 * 运行：node test/db-migration.test.js
 */
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { migrate, getSchemaVersion, TARGET_VERSION } = require('../packages/core/src/migrations');

let pass = 0;
let fail = 0;
async function test(name, fn) {
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    pass++;
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    fail++;
  }
}

function newDb() {
  return new DatabaseSync(':memory:');
}

function tables(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map((r) => r.name);
}
function triggers(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='trigger'").all().map((r) => r.name);
}
function indexes(db) {
  return db.prepare("SELECT name FROM sqlite_master WHERE type='index'").all().map((r) => r.name);
}

(async () => {
  console.log('数据库迁移');

  await test('全新库：迁移到目标版本并建好全部表', async () => {
    const db = newDb();
    const r = await migrate(db);
    assert.strictEqual(await getSchemaVersion(db), TARGET_VERSION);
    assert.strictEqual(r.from, 0);
    const t = tables(db);
    for (const name of ['comic_meta', 'comic_read', 'comic_ban', 'comic_star',
      'comic_meta_tag', 'comic_meta_author', 'comic_work', 'comic_meta_actor']) {
      assert.ok(t.includes(name), `缺少表 ${name}`);
    }
    db.close();
  });

  await test('全新库：索引与触发器齐全', async () => {
    const db = newDb();
    await migrate(db);
    const idx = indexes(db);
    assert.ok(idx.includes('idx_meta_sort_update'), '缺少排序索引');
    assert.ok(idx.includes('idx_meta_tag_tag'), '缺少标签索引');
    const trg = triggers(db);
    for (const n of ['comic_meta_tag_ai', 'comic_meta_tag_au', 'comic_meta_tag_ad',
      'comic_meta_author_ai', 'comic_work_ai', 'comic_meta_actor_ai']) {
      assert.ok(trg.includes(n), `缺少触发器 ${n}`);
    }
    db.close();
  });

  await test('幂等：重复迁移不报错、版本不变', async () => {
    const db = newDb();
    await migrate(db);
    const v1 = await getSchemaVersion(db);
    await migrate(db);
    await migrate(db);
    assert.strictEqual(await getSchemaVersion(db), v1);
    db.close();
  });

  await test('老库升级：已有数据不丢，且补齐缺失列', async () => {
    const db = newDb();
    // 模拟 1.0.0 的老库：没有 create_time/update_time，没有关联表
    db.exec(`CREATE TABLE comic_meta (
      id INTEGER PRIMARY KEY, name TEXT, images JSON, addtime TEXT, description TEXT,
      total_views TEXT, likes TEXT, series JSON, series_id TEXT,
      comment_total TEXT, author JSON, tags JSON, works JSON,
      actors JSON, related_list JSON, liked INTEGER, is_favorite INTEGER,
      is_aids INTEGER, price INTEGER, purchased TEXT
    )`);
    db.prepare('INSERT INTO comic_meta(id,name,tags) VALUES (?,?,?)')
      .run(1, '老数据', JSON.stringify(['tagA']));
    db.prepare('INSERT INTO comic_meta(id,name,tags) VALUES (?,?,?)')
      .run(2, '老数据2', JSON.stringify(['tagB']));

    await migrate(db);

    const rows = db.prepare('SELECT id,name FROM comic_meta ORDER BY id').all();
    assert.strictEqual(rows.length, 2, '老数据不能丢');
    assert.strictEqual(rows[0].name, '老数据');

    // 新列已补齐
    const cols = db.prepare('PRAGMA table_info(comic_meta)').all().map((c) => c.name);
    assert.ok(cols.includes('create_time'), '应补齐 create_time');
    assert.ok(cols.includes('update_time'), '应补齐 update_time');

    // 关联表已回填
    const tagRows = db.prepare('SELECT comic_id, tag FROM comic_meta_tag ORDER BY comic_id').all();
    assert.strictEqual(tagRows.length, 2, '应回填 2 条标签关联');
    assert.strictEqual(tagRows[0].tag, 'tagA');
    db.close();
  });

  await test('回归：重复标签不再触发 UNIQUE 冲突（1171888 问题）', async () => {
    const db = newDb();
    await migrate(db);
    const tags = JSON.stringify(['校園', '巨乳', '純愛', '巨乳', '中文']); // 巨乳重复
    const ins = db.prepare(`INSERT INTO comic_meta(id,name,tags) VALUES (?,?,?)
      ON CONFLICT(id) DO UPDATE SET tags=excluded.tags`);
    // 连续 3 次 UPSERT：第 2/3 次走 UPDATE 触发器（原 bug 触发点）
    ins.run(1171888, 'x', tags);
    ins.run(1171888, 'x', tags);
    ins.run(1171888, 'x', tags);
    const rows = db.prepare('SELECT tag FROM comic_meta_tag WHERE comic_id=1171888').all();
    assert.strictEqual(rows.length, 4, '重复标签应被去重为 4 条');
    db.close();
  });

  await test('关联表触发器：更新漫画时同步标签', async () => {
    const db = newDb();
    await migrate(db);
    db.prepare('INSERT INTO comic_meta(id,name,tags) VALUES (?,?,?)').run(10, 'a', JSON.stringify(['x', 'y']));
    let rows = db.prepare('SELECT tag FROM comic_meta_tag WHERE comic_id=10 ORDER BY tag').all();
    assert.deepStrictEqual(rows.map((r) => r.tag), ['x', 'y']);

    db.prepare('UPDATE comic_meta SET tags=? WHERE id=?').run(JSON.stringify(['z']), 10);
    rows = db.prepare('SELECT tag FROM comic_meta_tag WHERE comic_id=10').all();
    assert.deepStrictEqual(rows.map((r) => r.tag), ['z'], '旧标签应被替换');
    db.close();
  });

  await test('关联表触发器：删除漫画时清理关联', async () => {
    const db = newDb();
    await migrate(db);
    db.prepare('INSERT INTO comic_meta(id,name,tags) VALUES (?,?,?)').run(20, 'a', JSON.stringify(['x']));
    db.prepare('DELETE FROM comic_meta WHERE id=?').run(20);
    const rows = db.prepare('SELECT * FROM comic_meta_tag WHERE comic_id=20').all();
    assert.strictEqual(rows.length, 0, '删除后不应残留关联');
    db.close();
  });

  await test('版本高于代码：不报错、不回退', async () => {
    const db = newDb();
    db.exec('PRAGMA user_version = 99');
    const r = await migrate(db);
    assert.strictEqual(r.from, 99);
    assert.strictEqual(r.to, 99, '不应回退版本');
    db.close();
  });

  await test('历史遗留 user_version=2（旧版无迁移体系）→ 正常升级到 3', async () => {
    const db = newDb();
    // 模拟 1.0.2 用户库：结构已完整，但 user_version 被历史版本写成 2
    db.exec(`CREATE TABLE comic_meta (
      id INTEGER PRIMARY KEY, name TEXT, images JSON, addtime TEXT, description TEXT,
      total_views TEXT, likes TEXT, series JSON, series_id TEXT,
      comment_total TEXT, author JSON, tags JSON, works JSON,
      actors JSON, related_list JSON, liked INTEGER, is_favorite INTEGER,
      is_aids INTEGER, price INTEGER, purchased TEXT,
      create_time INTEGER, update_time INTEGER
    )`);
    db.exec(`CREATE TABLE comic_meta_tag (comic_id INTEGER NOT NULL, tag TEXT NOT NULL, PRIMARY KEY (comic_id, tag))`);
    db.exec('PRAGMA user_version = 2');
    db.prepare('INSERT INTO comic_meta(id,name,tags) VALUES (?,?,?)').run(5, '老库', JSON.stringify(['a']));

    const r = await migrate(db);
    assert.strictEqual(r.from, 2, '应识别历史版本 2');
    assert.strictEqual(r.to, 3, '应升级到 3');
    assert.ok(r.applied.length > 0, '应实际执行了迁移');
    // 数据仍在
    const row = db.prepare('SELECT name FROM comic_meta WHERE id=5').get();
    assert.strictEqual(row.name, '老库');
    db.close();
  });

  await test('真实文件：迁移后重开库版本保持', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-db-'));
    const file = path.join(tmp, 'test.sqlite');
    const db1 = new DatabaseSync(file);
    await migrate(db1);
    const v1 = await getSchemaVersion(db1);
    db1.close();

    const db2 = new DatabaseSync(file);
    await migrate(db2);
    assert.strictEqual(await getSchemaVersion(db2), v1);
    const t = tables(db2);
    assert.ok(t.includes('comic_meta_tag'));
    db2.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail > 0 ? 1 : 0);
})();
