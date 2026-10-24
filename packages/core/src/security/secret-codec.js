'use strict';

/**
 * 敏感配置加密存储
 *
 * 设计要点：
 * 1、core 包不依赖 koffi，因此加密能力由宿主（desktop）注入；
 *    未注入时自动降级为明文存储，保证 CLI / 非 Windows 环境可用。
 * 2、加密只作用于「敏感字段」，其余配置保持明文，便于用户排查。
 * 3、密文格式：`enc:v1:<base64>`，带版本前缀便于未来更换算法。
 * 4、解密失败（换机器/换用户/密文损坏）时返回空值并告警，**不抛异常**，
 *    避免整个应用起不来；用户重新填写密码即可。
 */

const ENC_PREFIX = 'enc:v1:';

/** 需要加密的配置键 */
const SENSITIVE_KEYS = ['password', 'token', 'cookie'];

/** @type {null | {encrypt:(s:string)=>string, decrypt:(s:string)=>string}} */
let _codec = null;

/**
 * 注入加密实现（由 desktop 在启动时调用）
 * @param {{encrypt:(plain:string)=>string, decrypt:(cipher:string)=>string}|null} codec
 */
function setCodec(codec) {
  if (codec && typeof codec.encrypt === 'function' && typeof codec.decrypt === 'function') {
    _codec = codec;
  } else {
    _codec = null;
  }
}

function hasCodec() {
  return !!_codec;
}

function isEncrypted(value) {
  return typeof value === 'string' && value.startsWith(ENC_PREFIX);
}

/**
 * 加密单个值。空值、已加密、无 codec 时原样返回。
 * @param {string} key
 * @param {*} value
 * @return {*}
 */
function encryptValue(key, value) {
  if (!SENSITIVE_KEYS.includes(key)) return value;
  if (value == null || value === '') return value;
  if (typeof value !== 'string') return value;
  if (isEncrypted(value)) return value;
  if (!_codec) return value;
  try {
    return ENC_PREFIX + _codec.encrypt(value);
  } catch {
    // 加密失败：保持明文，避免数据丢失
    return value;
  }
}

/**
 * 解密单个值。非密文、无 codec 时原样返回。
 * @param {string} key
 * @param {*} value
 * @return {*}
 */
function decryptValue(key, value) {
  if (!SENSITIVE_KEYS.includes(key)) return value;
  if (!isEncrypted(value)) return value;
  if (!_codec) {
    // 有密文但无解密能力（例如 CLI 环境）：返回空，避免把密文当密码用
    return '';
  }
  try {
    return _codec.decrypt(value.slice(ENC_PREFIX.length));
  } catch {
    // 解密失败（换机器/换用户/损坏）：返回空值，让用户重新填写
    return '';
  }
}

/**
 * 加密整个配置对象的敏感字段
 * @param {object} config
 * @return {object} 新对象（不修改入参）
 */
function encryptConfig(config) {
  const out = {...config};
  for (const key of SENSITIVE_KEYS) {
    if (key in out) out[key] = encryptValue(key, out[key]);
  }
  return out;
}

/**
 * 解密整个配置对象的敏感字段
 * @param {object} config
 * @return {object} 新对象（不修改入参）
 */
function decryptConfig(config) {
  const out = {...config};
  for (const key of SENSITIVE_KEYS) {
    if (key in out) out[key] = decryptValue(key, out[key]);
  }
  return out;
}

module.exports = {
    ENC_PREFIX,
    SENSITIVE_KEYS,
    setCodec,
    hasCodec,
    isEncrypted,
    encryptValue,
    decryptValue,
    encryptConfig,
    decryptConfig,
};
