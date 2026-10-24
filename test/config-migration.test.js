'use strict';
/**
 * config.json 兼容迁移测试
 * 运行：node test/config-migration.test.js
 */
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const {buildDefaults} = require('../packages/core/src/config-schema');
const {migrateConfig, CONFIG_SCHEMA_VERSION} = require('../packages/core/src/config');

const DEFAULTS = buildDefaults('C:/default/data');
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

console.log('config.json 兼容迁移');

// 1. 全新用户：无配置文件
test('全新用户（raw=null）→ setupCompleted=false', () => {
  const {config, changed} = migrateConfig(null, DEFAULTS);
  assert.strictEqual(config.setupCompleted, false, '应走首启引导');
  assert.strictEqual(changed, true);
});

// 2. 老用户：有配置但无 setupCompleted（1.0.1 及更早）
test('老用户（无 setupCompleted）→ setupCompleted=true，不被强制引导', () => {
  const old = {
    dataDir: 'F:/jm',
    username: 'olduser',
    password: 'oldpass',
    port: 47310,
    host: 'https://18comic.vip',
    cdnHosts: ['https://www.cdngwc.cc'],
    apiHosts: ['https://www.cdngwc.cc'],
    debug: false,
    token: 'abc',
    memberInfo: {uid: '1'},
  };
  const {config, changed} = migrateConfig(old, DEFAULTS);
  assert.strictEqual(config.setupCompleted, true, '老用户应视为已完成引导');
  assert.strictEqual(config.username, 'olduser', '用户名不能丢');
  assert.strictEqual(config.password, 'oldpass', '密码不能丢');
  assert.strictEqual(config.dataDir, 'F:/jm', '数据目录不能丢');
  assert.strictEqual(config.token, 'abc', 'token 不能丢');
  assert.strictEqual(changed, true);
});

// 3. 已完成引导的新用户：保持不变
test('已有 setupCompleted=true → 保持 true', () => {
  const cur = {...DEFAULTS, setupCompleted: true, configSchemaVersion: CONFIG_SCHEMA_VERSION};
  const {config} = migrateConfig(cur, DEFAULTS);
  assert.strictEqual(config.setupCompleted, true);
});

// 4. 用户明确未完成（例如中途退出）
test('setupCompleted=false → 保持 false', () => {
  const cur = {...DEFAULTS, setupCompleted: false, configSchemaVersion: CONFIG_SCHEMA_VERSION};
  const {config} = migrateConfig(cur, DEFAULTS);
  assert.strictEqual(config.setupCompleted, false);
});

// 5. 新增字段补齐
test('缺失的新字段被补齐默认值', () => {
  const old = {dataDir: 'D:/x', setupCompleted: true};
  const {config} = migrateConfig(old, DEFAULTS);
  assert.ok('harmonyUseCover' in config, 'harmonyUseCover 应被补齐');
  assert.strictEqual(config.harmonyUseCover, false);
  assert.ok('proxy' in config);
});

// 6. 未知字段保留（向前兼容）
test('未知字段不被丢弃', () => {
  const old = {dataDir: 'D:/x', setupCompleted: true, futureField: 'keep-me'};
  const {config} = migrateConfig(old, DEFAULTS);
  assert.strictEqual(config.futureField, 'keep-me');
});

// 7. dataDir 为空时回落
test('dataDir 为空 → 回落默认目录', () => {
  const old = {dataDir: '', setupCompleted: true};
  const {config} = migrateConfig(old, DEFAULTS);
  assert.strictEqual(config.dataDir, 'C:/default/data');
});

// 8. 损坏的 config.json（非对象）
test('配置损坏（数组）→ 按全新用户处理且不崩溃', () => {
  const {config} = migrateConfig([], DEFAULTS);
  assert.strictEqual(config.setupCompleted, false);
  assert.strictEqual(config.dataDir, 'C:/default/data');
});

// 9. 结构版本写入
test('写入 configSchemaVersion', () => {
  const {config} = migrateConfig({dataDir: 'D:/x'}, DEFAULTS);
  assert.strictEqual(config.configSchemaVersion, CONFIG_SCHEMA_VERSION);
});

// 10. 真实文件往返：createConfig 读老配置后落盘，再读仍一致
test('真实文件往返：老配置升级后持久化且可重复读取', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jm-cfg-'));
  const appdata = path.join(tmp, 'appdata');
  fs.mkdirSync(path.join(appdata, 'JmComicManager'), {recursive: true});
  const cfgFile = path.join(appdata, 'JmComicManager', 'config.json');
  fs.writeFileSync(cfgFile, JSON.stringify({
    dataDir: path.join(tmp, 'data'),
    username: 'legacy',
    password: 'legacypw',
    port: 47310,
    host: 'https://18comic.vip',
    cdnHosts: ['https://cdn-msp.18comic.vip'],
    apiHosts: ['https://www.cdnhjk.net'],
    debug: false,
  }), 'utf-8');

  const oldAppData = process.env.APPDATA;
  process.env.APPDATA = appdata;
  // 清掉 require 缓存，让 appDataDir 重新求值
  delete require.cache[require.resolve('../packages/core/util/app')];
  delete require.cache[require.resolve('../packages/core/src/config')];
  delete require.cache[require.resolve('../packages/core/src/config-schema')];

  const {createConfig} = require('../packages/core/src/config');
  const cfg = createConfig({id: 'test'}, {});

  const first = cfg.get();
  assert.strictEqual(first.setupCompleted, true, '老用户升级不应被引导');
  assert.strictEqual(first.username, 'legacy');

  // 落盘校验
  const disk = JSON.parse(fs.readFileSync(cfgFile, 'utf-8'));
  assert.strictEqual(disk.setupCompleted, true, 'setupCompleted 应写入磁盘');
  assert.strictEqual(disk.username, 'legacy', '用户数据应保留');

  // 二次读取保持一致
  const second = cfg.get();
  assert.strictEqual(second.setupCompleted, true);
  assert.strictEqual(second.username, 'legacy');

  process.env.APPDATA = oldAppData;
  fs.rmSync(tmp, {recursive: true, force: true});
});

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
