'use strict';
/**
 * 日志轮转测试
 * 运行：node test/log-rotate.test.js
 *
 * 说明：log-rotate.js 是 ESM，这里用动态 import。
 */
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

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
  console.log('日志轮转');

  const mod = await import('../packages/desktop/src/log-rotate.js');
  const { createRotatingStream, rotate } = mod;

  await test('小日志不轮转', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-log-'));
    const file = path.join(tmp, 'a.log');
    const s = createRotatingStream({ file, maxBytes: 1024, backups: 2 });
    s.write('hello\n');
    s.close();
    await new Promise((r) => setTimeout(r, 100));
    assert.ok(fs.existsSync(file));
    assert.ok(!fs.existsSync(file + '.1'), '不应产生归档');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  await test('超过阈值触发轮转，并保留 backups 个归档', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-log-'));
    const file = path.join(tmp, 'b.log');
    const maxBytes = 512;
    const s = createRotatingStream({ file, maxBytes, backups: 2 });

    // 写足够多触发多次轮转
    const line = 'x'.repeat(100) + '\n';
    for (let i = 0; i < 40; i++) {
      s.write(line);
      await new Promise((r) => setTimeout(r, 2));
    }
    s.close();
    await new Promise((r) => setTimeout(r, 200));

    const archives = fs.readdirSync(tmp).filter((f) => f.startsWith('b.log.'));
    assert.ok(archives.length > 0, '应产生归档');
    assert.ok(archives.length <= 2, `归档数不应超过 backups=2，实际 ${archives.length}`);
    // 不应出现 .3
    assert.ok(!fs.existsSync(file + '.3'), '不应超过 backups 上限');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  await test('启动时已超限 → 立即轮转', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-log-'));
    const file = path.join(tmp, 'c.log');
    fs.writeFileSync(file, 'y'.repeat(2048));
    const s = createRotatingStream({ file, maxBytes: 1024, backups: 2 });
    s.write('new line\n');
    s.close();
    await new Promise((r) => setTimeout(r, 150));

    assert.ok(fs.existsSync(file + '.1'), '旧内容应被归档');
    const archived = fs.readFileSync(file + '.1', 'utf8');
    assert.strictEqual(archived.length, 2048, '归档内容应为原内容');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  await test('rotate() 直接调用：文件链正确移位', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-log-'));
    const file = path.join(tmp, 'd.log');
    fs.writeFileSync(file, 'current');
    fs.writeFileSync(file + '.1', 'old1');
    fs.writeFileSync(file + '.2', 'old2');

    rotate(file, 2);

    assert.strictEqual(fs.readFileSync(file + '.1', 'utf8'), 'current');
    assert.strictEqual(fs.readFileSync(file + '.2', 'utf8'), 'old1');
    // 最旧的 old2 被删除（backups=2 只保留 .1/.2）
    assert.ok(!fs.existsSync(file + '.3'));
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  await test('backups=0 时不保留归档', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-log-'));
    const file = path.join(tmp, 'e.log');
    fs.writeFileSync(file, 'z'.repeat(100));
    rotate(file, 0);
    assert.ok(!fs.existsSync(file + '.1'), 'backups=0 不应保留归档');
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  await test('写入失败不抛异常（目录不存在时）', async () => {
    // 指向一个不可能创建的路径，构造时不应抛出
    const s = createRotatingStream({ file: path.join(os.tmpdir(), '\0invalid', 'x.log') });
    // 不抛错即通过
    s.write('x');
    s.close();
  });

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail > 0 ? 1 : 0);
})();
