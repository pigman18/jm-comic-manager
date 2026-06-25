'use strict';

const fs = require('fs');
const path = require('path');
const Module = require('module');
const os = require('os');

const MODULES = {
    taskbar_progress: require('./taskbar_progress_embed')
};

const cache = new Map();
const EXTRACT_DIR = path.join(os.tmpdir(), 'jm-native');

function ensureExtractDir() {
    if (!fs.existsSync(EXTRACT_DIR)) {
        fs.mkdirSync(EXTRACT_DIR, { recursive: true });
    }
}

function extractNative(name) {
    if (cache.has(name)) return cache.get(name);

    const base64 = MODULES[name];
    if (!base64) throw new Error(`extractNative: unknown module "${name}"`);

    ensureExtractDir();
    const nodePath = path.join(EXTRACT_DIR, `${name}.node`);

    if (!fs.existsSync(nodePath)) {
        const buf = Buffer.from(base64, 'base64');
        fs.writeFileSync(nodePath, buf);
    }

    const mod = loadAddon(nodePath, name);
    cache.set(name, mod);
    return mod;
}

function loadAddon(filePath, name) {
    try {
        const mod = new Module(filePath, module);
        mod.exports = {};
        mod.filename = path.resolve(filePath);
        process.dlopen(mod, mod.filename);
        return mod.exports;
    } catch (err) {
        throw new Error(`extractNative: failed to load "${name}": ${err.message}`);
    }
}

module.exports = { extractNative };
