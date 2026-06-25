'use strict';

const fs = require('fs');
const path = require('path');
const os = require('os');

// ============ 配置 ============
const MODULES = {
    taskbar_progress: require('./taskbar_progress_embed')
    // 未来可扩展：
    // my_other_addon: require('./my_other_addon_embed')
};

// ============ 状态 ============
const cache = new Map();        // name → loaded addon

// ============ 核心逻辑 ============

/**
 * 获取“可信解压目录”
 * Windows: exe 同级目录（COM 合规）
 * 其他平台: 按原逻辑
 */
function getExtractDir() {
    // pkg / webpack bundle 场景
    if (process.execPath) {
        return path.dirname(process.execPath);
    }
    return os.tmpdir();
}

/**
 * 懒加载并解压 native addon
 * @param {string} name - 模块名（对应 MODULES 的 key）
 * @returns {any} 加载后的 addon 对象
 */
function extractNative(name) {
    // 1️⃣ 已加载 → 直接返回
    if (cache.has(name)) {
        return cache.get(name);
    }

    // 3️⃣ 首次加载
    const base64 = MODULES[name];
    if (!base64) {
        throw new Error(`extractNative: unknown module "${name}"`);
    }

    const dir = getExtractDir();
    const nodePath = path.join(dir, `${name}.node`);

    // 4️⃣ 如果文件不存在 → 解压
    if (!fs.existsSync(nodePath)) {
        // 防权限问题：如果 exe 目录不可写，fallback 到 temp
        try {
            const buf = Buffer.from(base64, 'base64');
            fs.writeFileSync(nodePath, buf);
        } catch (e) {
            // exe 目录不可写（如 C:\Program Files），降级到 temp
            const fallbackDir = fs.mkdtempSync(path.join(os.tmpdir(), 'native-'));
            const fallbackPath = path.join(fallbackDir, `${name}.node`);
            fs.writeFileSync(fallbackPath, Buffer.from(base64, 'base64'));
            // 这里在 temp 目录，COM 可能不工作，但至少尝试了
            return loadAddon(fallbackPath, name);
        }
    }

    let mod = loadAddon(nodePath, name);
    cache.set(name, mod);
    return mod;
}

/**
 * 安全加载 .node 文件
 */
function loadAddon(filePath, name) {
    try {
        // return require(filePath);
        process.dlopen(
            module,
            path.resolve(filePath)
        );
        return module.exports;
    } catch (err) {
        throw new Error(`extractNative: failed to load "${name}": ${err.message}`);
    }
}

// ============ 清理（可选）============

/**
 * 删除已解压的文件（仅删除 exe 目录下的）
 */
function cleanup(name) {
    try {
        const dir = getExtractDir();
        const nodePath = path.join(dir, `${name}.node`);
        if (fs.existsSync(nodePath)) {
            fs.unlinkSync(nodePath);
        }
    } catch {}
}

/**
 * 清理所有托管模块
 */
function cleanupAll() {
    for (const name of Object.keys(MODULES)) {
        cleanup(name);
    }
}

// 进程退出时自动清理（可选，注释掉则不清理）
process.on('exit', cleanupAll);

// ============ 导出 ============
module.exports = {
    extractNative,
    cleanup,
    cleanupAll
};
