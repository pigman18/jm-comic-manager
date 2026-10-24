/**
 * 敏感配置加解密（AES-256-GCM + scrypt 派生密钥）
 *
 * 为什么不用 Windows DPAPI：
 *   DPAPI 需要 koffi 调用 crypt32.dll，而 koffi 通过动态 require 加载原生模块，
 *   pkg 打包后无法解析（实测 `Cannot find module 'koffi'`），因此在打包版不可用。
 *
 * 本方案的安全边界（务必知晓）：
 *   - 密钥由「机器名 + 用户名 + 用户域 + 应用盐」派生，**同一用户同一机器**可解密；
 *   - 因此它防的是「config.json 被拷到别的机器/别的用户」和「随手看到明文」，
 *     不防「本机同用户的恶意程序」（那种场景需要 DPAPI 或系统凭据管理器）。
 *   - 相比明文存储已是显著改进，且不引入任何原生依赖，打包稳定。
 *
 * 存储格式：enc:v1:<base64(iv[12] + tag[16] + ciphertext)>
 */
import crypto from 'node:crypto';
import os from 'node:os';

const ALG = 'aes-256-gcm';
const IV_LEN = 12;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SCRYPT_SALT = 'jm-local-secret-v1';
const APP_SALT = 'jm-comic-manager';

/** 缓存的密钥（避免每次加解密都跑 scrypt，约 90ms） */
let _cachedKey = null;

function deriveKey() {
  if (_cachedKey) return _cachedKey;
  const material = [
    os.hostname(),
    process.env.USERNAME || process.env.USER || '',
    process.env.USERDOMAIN || '',
    APP_SALT,
  ].join('|');
  _cachedKey = crypto.scryptSync(material, SCRYPT_SALT, KEY_LEN, {
    N: 32768,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return _cachedKey;
}

/**
 * 创建 codec 供 core 注入
 * @return {{encrypt:(s:string)=>string, decrypt:(s:string)=>string}|null}
 */
function createLocalCodec() {
  try {
    // 提前派生一次，若环境异常（如 crypto 不可用）则返回 null 让 core 降级
    deriveKey();
  } catch {
    return null;
  }

  return {
    /** @param {string} plain @returns {string} base64 */
    encrypt(plain) {
      const key = deriveKey();
      const iv = crypto.randomBytes(IV_LEN);
      const cipher = crypto.createCipheriv(ALG, key, iv);
      const enc = Buffer.concat([cipher.update(String(plain), 'utf8'), cipher.final()]);
      const tag = cipher.getAuthTag();
      return Buffer.concat([iv, tag, enc]).toString('base64');
    },
    /** @param {string} cipherB64 @returns {string} */
    decrypt(cipherB64) {
      const buf = Buffer.from(String(cipherB64), 'base64');
      if (buf.length < IV_LEN + TAG_LEN) throw new Error('密文长度不足');
      const iv = buf.subarray(0, IV_LEN);
      const tag = buf.subarray(IV_LEN, IV_LEN + TAG_LEN);
      const enc = buf.subarray(IV_LEN + TAG_LEN);
      const key = deriveKey();
      const decipher = crypto.createDecipheriv(ALG, key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
    },
  };
}

export { createLocalCodec };
