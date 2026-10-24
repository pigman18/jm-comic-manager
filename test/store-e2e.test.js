'use strict';
/**
 * store 端到端：走真实 createStore（内部使用迁移）验证读写正常
 * 运行：node test/store-e2e.test.js
 */
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const { createStore } = require('../packages/core/src/store');

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

(async () => {
  console.log('store 端到端（经迁移建库）');

  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-store-e2e-'));
  const store = createStore({ id: 'test' }, {}, null, { dataDir: tmp }, null);

  await test('首次 connect 自动迁移建库', async () => {
    const db = await store.connect();
    const rows = await db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all({});
    const names = rows.map((r) => r.name);
    assert.ok(names.includes('comic_meta'), '应建好 comic_meta');
    assert.ok(names.includes('comic_meta_tag'), '应建好 comic_meta_tag');
  });

  await test('重复标签写入不报错（1171888 回归）', async () => {
    const info = {
      id: 1171888, name: 'test', images: ['https://e.com/a.jpg'], addtime: '2026-10-23',
      description: '', total_views: '1', likes: '1', series: [], series_id: '',
      comment_total: '0', author: ['A', 'A'], tags: ['校園', '巨乳', '純愛', '巨乳', '中文'],
      works: ['W', 'W'], actors: ['Y', 'Y'], related_list: [], liked: false,
      is_favorite: false, is_aids: false, price: 0, purchased: '',
    };
    const row = store.jsonRowToDb(info);
    await store.comicMeta.saveOrUpdate(row);
    await store.comicMeta.saveOrUpdate(row); // UPDATE 路径
    const got = await store.comicMeta.get(1171888);
    assert.ok(got, '应能读回');
    const tags = JSON.parse(got.tags);
    assert.strictEqual(tags.length, 4, `标签应去重为 4，实际 ${tags.length}`);
  });

  await test('关联表已按去重后的标签填充', async () => {
    const db = await store.connect();
    const rows = await db.prepare('SELECT tag FROM comic_meta_tag WHERE comic_id=1171888').all({});
    assert.strictEqual(rows.length, 4);
  });

  await test('分页查询可用', async () => {
    const { total, rows } = await store.comicMeta.page({ page: 1, pageSize: 10 });
    assert.strictEqual(total, 1);
    assert.strictEqual(rows.length, 1);
  });

  await test('标签联想查询可用', async () => {
    const tags = await store.comicMeta.listTags('巨');
    assert.ok(tags.includes('巨乳'), '应能搜到巨乳');
  });

  await test('已读/屏蔽/关注 可用', async () => {
    await store.comicRead.saveRead(1171888);
    assert.deepStrictEqual(await store.comicRead.checkReads([1171888]), [1171888]);
    await store.comicBan.addBan(1171888);
    assert.deepStrictEqual(await store.comicBan.checkBans([1171888]), [1171888]);
    await store.comicStar.addStar(1171888);
    assert.deepStrictEqual(await store.comicStar.checkStars([1171888]), [1171888]);
  });

  await store.close();
  fs.rmSync(tmp, { recursive: true, force: true });

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail > 0 ? 1 : 0);
})();
