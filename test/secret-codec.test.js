'use strict';
/**
 * 敏感配置加密测试（core 层，使用模拟 codec）
 * 运行：node test/secret-codec.test.js
 */
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {
  setCodec, hasCodec, isEncrypted, encryptValue, decryptValue,
  encryptConfig, decryptConfig, ENC_PREFIX, SENSITIVE_KEYS,
} = require('../packages/core/src/security/secret-codec');

let pass = 0;
let fail = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    pass++;
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    fail++;
  }
}

// 模拟 codec（可逆 + 可失败）
const mockCodec = {
  encrypt: (s) => Buffer.from(`MOCK|${s}`).toString('base64'),
  decrypt: (s) => {
    const raw = Buffer.from(s, 'base64').toString('utf8');
    if (!raw.startsWith('MOCK|')) throw new Error('bad cipher');
    return raw.slice(5);
  },
};

console.log('敏感配置加密');

test('未注入 codec 时原样返回（降级明文）', () => {
  setCodec(null);
  assert.strictEqual(hasCodec(), false);
  assert.strictEqual(encryptValue('password', 'p@ss'), 'p@ss');
  assert.strictEqual(decryptValue('password', 'p@ss'), 'p@ss');
});

test('注入后 password 被加密且带前缀', () => {
  setCodec(mockCodec);
  assert.strictEqual(hasCodec(), true);
  const enc = encryptValue('password', 'p@ss');
  assert.ok(enc.startsWith(ENC_PREFIX), '应带 enc:v1: 前缀');
  assert.ok(!enc.includes('p@ss'), '密文不应包含明文');
  assert.strictEqual(isEncrypted(enc), true);
});

test('加解密可逆', () => {
  const enc = encryptValue('password', '中文密码123');
  assert.strictEqual(decryptValue('password', enc), '中文密码123');
});

test('敏感字段集合正确', () => {
  assert.deepStrictEqual(SENSITIVE_KEYS.sort(), ['cookie', 'password', 'token'].sort());
});

test('非敏感字段不加密', () => {
  assert.strictEqual(encryptValue('username', 'alice'), 'alice');
  assert.strictEqual(encryptValue('dataDir', 'D:/x'), 'D:/x');
});

test('空值不加密', () => {
  assert.strictEqual(encryptValue('password', ''), '');
  assert.strictEqual(encryptValue('password', null), null);
  assert.strictEqual(encryptValue('password', undefined), undefined);
});

test('已加密的值重复加密不变（幂等）', () => {
  const enc = encryptValue('password', 'x');
  assert.strictEqual(encryptValue('password', enc), enc);
});

test('整对象加解密只动敏感字段', () => {
  const cfg = { username: 'alice', password: 'pw', token: 'tk', cookie: 'ck', port: 47310 };
  const enc = encryptConfig(cfg);
  assert.strictEqual(enc.username, 'alice');
  assert.strictEqual(enc.port, 47310);
  assert.ok(isEncrypted(enc.password));
  assert.ok(isEncrypted(enc.token));
  assert.ok(isEncrypted(enc.cookie));
  // 原对象未被修改
  assert.strictEqual(cfg.password, 'pw');

  const dec = decryptConfig(enc);
  assert.strictEqual(dec.password, 'pw');
  assert.strictEqual(dec.token, 'tk');
  assert.strictEqual(dec.cookie, 'ck');
});

test('解密失败（换机器/损坏）返回空值而非抛异常', () => {
  const broken = { encrypt: () => 'x', decrypt: () => { throw new Error('cannot decrypt'); } };
  setCodec(broken);
  const enc = ENC_PREFIX + 'garbage';
  assert.strictEqual(decryptValue('password', enc), '', '应降级为空字符串');
});

test('有密文但无 codec（CLI 环境）返回空值', () => {
  setCodec(mockCodec);
  const enc = encryptValue('password', 'secret');
  setCodec(null);
  assert.strictEqual(decryptValue('password', enc), '', '不应把密文当明文用');
});

test('加密抛异常时保持明文（不丢数据）', () => {
  setCodec({ encrypt: () => { throw new Error('boom'); }, decrypt: (s) => s });
  assert.strictEqual(encryptValue('password', 'keepme'), 'keepme');
});

test('config.js 落盘时敏感字段被加密、读取时还原', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-secret-'));
  const appdata = path.join(tmp, 'appdata');
  fs.mkdirSync(path.join(appdata, 'JmComicManager'), { recursive: true });

  const oldAppData = process.env.APPDATA;
  process.env.APPDATA = appdata;
  for (const m of ['../packages/core/util/app', '../packages/core/src/config', '../packages/core/src/config-schema']) {
    delete require.cache[require.resolve(m)];
  }

  // 注意：清理缓存后必须重新 require secret-codec 并注入（模块实例已变）
  const codecMod = require('../packages/core/src/security/secret-codec');
  codecMod.setCodec(mockCodec);
  const { createConfig } = require('../packages/core/src/config');
  const cfg = createConfig({ id: 'test' }, {});
  cfg.setValue('username', 'alice');
  cfg.setValue('password', 'topsecret');

  // 磁盘上应为密文
  const cfgFile = path.join(appdata, 'JmComicManager', 'config.json');
  const disk = JSON.parse(fs.readFileSync(cfgFile, 'utf8'));
  assert.strictEqual(disk.username, 'alice', '用户名应明文');
  assert.ok(isEncrypted(disk.password), `密码应加密，实际: ${disk.password}`);
  assert.ok(!JSON.stringify(disk).includes('topsecret'), '磁盘不应出现明文密码');

  // 内存中读取应为明文
  const read = cfg.get();
  assert.strictEqual(read.password, 'topsecret', '读取应还原明文');

  process.env.APPDATA = oldAppData;
  setCodec(null);
  fs.rmSync(tmp, { recursive: true, force: true });
});

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
