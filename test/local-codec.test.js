'use strict';
/**
 * 桌面端本地加密 codec 测试（AES-256-GCM）
 * 运行：node test/local-codec.test.js
 */
const assert = require('node:assert');

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
  console.log('本地加密 codec (AES-256-GCM)');

  const mod = await import('../packages/desktop/src/secret-codec.js');
  const { createLocalCodec } = mod;
  const codec = createLocalCodec();

  await test('codec 创建成功', () => {
    assert.ok(codec, '应返回 codec');
    assert.strictEqual(typeof codec.encrypt, 'function');
    assert.strictEqual(typeof codec.decrypt, 'function');
  });

  await test('ASCII 往返', () => {
    const enc = codec.encrypt('hello-world');
    assert.notStrictEqual(enc, 'hello-world', '密文不应等于明文');
    assert.strictEqual(codec.decrypt(enc), 'hello-world');
  });

  await test('中文往返', () => {
    const enc = codec.encrypt('中文密码123');
    assert.strictEqual(codec.decrypt(enc), '中文密码123');
  });

  await test('长文本往返', () => {
    const long = 'x'.repeat(8192);
    assert.strictEqual(codec.decrypt(codec.encrypt(long)), long);
  });

  await test('空字符串往返', () => {
    assert.strictEqual(codec.decrypt(codec.encrypt('')), '');
  });

  await test('相同明文两次加密结果不同（随机 IV）', () => {
    assert.notStrictEqual(codec.encrypt('same'), codec.encrypt('same'));
  });

  await test('篡改密文导致解密失败（GCM 认证）', () => {
    const enc = codec.encrypt('tamper-me');
    const buf = Buffer.from(enc, 'base64');
    buf[buf.length - 1] ^= 0xff;
    assert.throws(() => codec.decrypt(buf.toString('base64')));
  });

  await test('密文长度不足时抛错', () => {
    assert.throws(() => codec.decrypt(Buffer.from('short').toString('base64')));
  });

  await test('跨 codec 实例可互相解密（密钥派生稳定）', () => {
    const c2 = createLocalCodec();
    const enc = codec.encrypt('shared');
    assert.strictEqual(c2.decrypt(enc), 'shared');
  });

  await test('与 core secret-codec 集成：落盘加密、读取还原', () => {
    const fs = require('node:fs');
    const os = require('node:os');
    const path = require('node:path');

    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-local-'));
    const appdata = path.join(tmp, 'appdata');
    fs.mkdirSync(path.join(appdata, 'JmComicManager'), { recursive: true });
    const oldAppData = process.env.APPDATA;
    process.env.APPDATA = appdata;

    for (const m of ['../packages/core/util/app', '../packages/core/src/config', '../packages/core/src/config-schema', '../packages/core/src/security/secret-codec']) {
      delete require.cache[require.resolve(m)];
    }
    const codecMod = require('../packages/core/src/security/secret-codec');
    codecMod.setCodec(codec);

    const { createConfig } = require('../packages/core/src/config');
    const cfg = createConfig({ id: 'test' }, {});
    cfg.setValue('username', 'alice');
    cfg.setValue('password', 'MyP@ssw0rd!');
    cfg.setValue('token', 'tok_abc123');

    const cfgFile = path.join(appdata, 'JmComicManager', 'config.json');
    const raw = fs.readFileSync(cfgFile, 'utf8');
    assert.ok(!raw.includes('MyP@ssw0rd!'), '磁盘不应出现明文密码');
    assert.ok(!raw.includes('tok_abc123'), '磁盘不应出现明文 token');
    assert.ok(raw.includes('enc:v1:'), '应为密文格式');

    const disk = JSON.parse(raw);
    assert.strictEqual(disk.username, 'alice', '用户名保持明文');
    assert.strictEqual(codec.decrypt(disk.password.replace('enc:v1:', '')), 'MyP@ssw0rd!', '密文可解出原文');

    // 内存读取应还原
    const read = cfg.get();
    assert.strictEqual(read.password, 'MyP@ssw0rd!');
    assert.strictEqual(read.token, 'tok_abc123');

    process.env.APPDATA = oldAppData;
    codecMod.setCodec(null);
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
  process.exit(fail > 0 ? 1 : 0);
})();
