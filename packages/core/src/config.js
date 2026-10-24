'use strict'

const fs = require('node:fs');
const path = require('node:path');
const {appDataDir} = require('../util/app');
const {mkdirSyncIfNotExists} = require('../util/file');
const {buildDefaults, FIELDS} = require('./config-schema');
const {encryptConfig, decryptConfig} = require('./security/secret-codec');

const CHANGE = 'handleChangeConfig';

// 默认配置由 config-schema.js 单一来源生成，避免字段在两处各写一套
let defaultConfig = buildDefaults(path.join(appDataDir(), 'data'));

/** 配置结构版本：用于识别需要迁移的旧 config.json */
const CONFIG_SCHEMA_VERSION = 2;

/**
 * 把磁盘上的原始配置规范化：
 * 1、以 schema 默认值打底，保证新增字段有值
 * 2、保留用户已有的未知字段（不丢数据）
 * 3、dataDir 为空时回落到默认目录
 */
function normalizeConfig(raw, defaults) {
  const out = {...defaults};
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    for (const [k, v] of Object.entries(raw)) {
      out[k] = v;
    }
  }
  if (!out.dataDir) out.dataDir = defaults.dataDir;
  return out;
}

/**
 * 旧配置迁移。
 *
 * 背景：1.0.2 之前没有 setupCompleted 字段，首启引导是新加的。
 * 若直接按"缺 setupCompleted 就走引导"判断，老用户升级后会被强制重走一遍。
 *
 * 规则：
 * - config.json 不存在            → 全新用户，setupCompleted = false（走引导）
 * - 存在且无 setupCompleted 字段  → 老用户，视为已完成引导（setupCompleted = true）
 * - 存在且已有 setupCompleted     → 保持不变
 *
 * @return {{config: object, changed: boolean}}
 */
function migrateConfig(raw, defaults) {
  const existed = raw && typeof raw === 'object' && !Array.isArray(raw);
  const config = normalizeConfig(raw, defaults);
  let changed = false;

  if (!existed) {
    // 全新用户：确保走首启引导
    if (config.setupCompleted !== false) {
      config.setupCompleted = false;
      changed = true;
    }
  } else if (raw.setupCompleted === undefined) {
    // 老版本配置：视为已完成引导，避免升级后被打断
    config.setupCompleted = true;
    changed = true;
  }

  // 补齐 schema 中缺失的字段（新增字段上线时）
  for (const f of FIELDS) {
    if (!(f.key in config)) {
      config[f.key] = Array.isArray(f.default) ? [...f.default] : f.default;
      changed = true;
    }
  }

  // 记录结构版本，便于后续迁移判断
  if (config.configSchemaVersion !== CONFIG_SCHEMA_VERSION) {
    config.configSchemaVersion = CONFIG_SCHEMA_VERSION;
    changed = true;
  }

  return {config, changed};
}

/**
 * JM 模块用户配置（磁盘上的 config.json）
 * manifest.json 为模块应用配置（随包发布）；config.json 为用户配置
 * @param manifest {object}         JM 模块应用配置
 * @param ctx      {*|null}         上下文对象
 * @return {{get: function(): object, setValue: function(string, *): void, trigger: function(object): void}}
 */
function createConfig(manifest, ctx) {
  let configFile = path.join(appDataDir(), 'config.json');

  if (typeof ctx?.event?.on === 'function') {
    ctx.event.on(CHANGE, trigger);
  }

  function readRaw() {
    try {
      return JSON.parse(fs.readFileSync(configFile, 'UTF-8'));
    } catch {
      return null;
    }
  }

  /** 落盘：敏感字段（password/token/cookie）加密后再写 */
  function persist(config) {
    try { fs.mkdirSync(path.dirname(configFile), { recursive: true }); } catch {}
    let toWrite = config;
    try {
      toWrite = encryptConfig(config);
    } catch { /* 加密不可用时降级为明文 */ }
    fs.writeFileSync(configFile, JSON.stringify(toWrite, null, 2));
  }

  function get() {
    const raw = readRaw();
    // 先解密敏感字段，再做结构迁移（迁移逻辑只处理结构，不关心值是否加密）
    let decoded = raw;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      try { decoded = decryptConfig(raw); } catch { decoded = raw; }
    }
    const {config, changed} = migrateConfig(decoded, defaultConfig);
    // 首次生成或发生迁移时落盘，保证下次读取不再重复迁移
    if (changed || raw === null) persist(config);
    return {...config};
  }

  let _config = get();
  const out = {..._config};
  mkdirSyncIfNotExists(`${_config.dataDir}/comic`);
  mkdirSyncIfNotExists(`${_config.dataDir}/file`);
  mkdirSyncIfNotExists(`${_config.dataDir}/info`);

  function trigger(bundle) {
    if (!bundle || bundle.id !== manifest.id) return;
    _config = get();
    for (const k of Object.keys(out)) {
      if (k === 'get' || k === 'setValue' || k === 'trigger' || k === 'close') continue;
      delete out[k];
    }
    Object.assign(out, _config);
  }

  function setValue(key, value) {
    _config[key] = value;
    out[key] = value;
    persist(_config);
  }

  function close() {
    if (typeof ctx?.event?.off === 'function') {
      ctx.event.off(CHANGE, trigger);
    }
  }

  out.get = get;
  out.setValue = setValue;
  out.trigger = trigger;
  out.close = close;
  return out;
}

module.exports = {
  createConfig,
  // 导出内部函数便于测试
  normalizeConfig,
  migrateConfig,
  CONFIG_SCHEMA_VERSION,
};
