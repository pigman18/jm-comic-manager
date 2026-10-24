#!/usr/bin/env node
/**
 * 从 config-schema.js 生成 docs/CONFIG.md
 *
 * 目的：配置项文档与代码保持同步，避免手工维护导致漂移。
 * 用法：node scripts/gen-config-doc.mjs [--check]
 *   --check  只校验文档是否最新，不一致时退出码 1（可用于 CI）
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'docs', 'CONFIG.md');

const { FIELDS, CONFIG_SCHEMA_VERSION } = (() => {
    const schema = require(path.join(ROOT, 'packages/core/src/config-schema.js'));
    let version = null;
    try {
        version = require(path.join(ROOT, 'packages/core/src/config.js')).CONFIG_SCHEMA_VERSION;
    } catch { /* ignore */ }
    return { FIELDS: schema.FIELDS, CONFIG_SCHEMA_VERSION: version };
})();

const GROUP_LABEL = {
    basic: '基本设置',
    network: '网络设置',
    advanced: '高级设置',
    internal: '内部字段',
};

const TYPE_LABEL = {
    string: '文本',
    password: '密码',
    number: '数字',
    boolean: '开关',
    'string[]': '字符串列表',
    dir: '目录',
    file: '文件',
    object: '对象',
};

function formatDefault(f) {
    const v = typeof f.default === 'function' ? f.default() : f.default;
    if (v === null) return '`null`';
    if (typeof v === 'string') return v === '' ? '空字符串' : '`' + v + '`';
    if (Array.isArray(v)) return v.length ? v.map((x) => '`' + x + '`').join('、') : '空数组';
    return '`' + String(v) + '`';
}

function build() {
    const lines = [];
    lines.push('# 配置说明（CONFIG）');
    lines.push('');
    lines.push('> 本文由 `scripts/gen-config-doc.mjs` 从 `packages/core/src/config-schema.js` **自动生成**，请勿手工修改。');
    lines.push('> 重新生成：`node scripts/gen-config-doc.mjs`');
    lines.push('');
    lines.push('## 配置文件位置');
    lines.push('');
    lines.push('| 平台 | 路径 |');
    lines.push('|---|---|');
    lines.push('| Windows | `%APPDATA%\\JmComicManager\\config.json` |');
    lines.push('| macOS | `~/Library/Application Support/JmComicManager/config.json` |');
    lines.push('| Linux | `~/.config/JmComicManager/config.json` |');
    lines.push('');
    if (CONFIG_SCHEMA_VERSION != null) {
        lines.push(`配置结构版本：**${CONFIG_SCHEMA_VERSION}**（记录在 \`configSchemaVersion\` 字段）`);
        lines.push('');
    }
    lines.push('---');
    lines.push('');

    for (const group of ['basic', 'network', 'advanced', 'internal']) {
        const items = FIELDS.filter((f) => f.group === group);
        if (!items.length) continue;
        lines.push(`## ${GROUP_LABEL[group] || group}`);
        lines.push('');
        lines.push('| 字段 | 说明 | 类型 | 默认值 | 需重启 |');
        lines.push('|---|---|---|---|---|');
        for (const f of items) {
            const label = f.label || f.key;
            const note = f.hidden ? '（内部字段，不参与界面）' : '';
            const ph = f.placeholder ? `<br>示例：${f.placeholder}` : '';
            const range = (f.min != null || f.max != null)
                ? `<br>范围：${f.min ?? '−∞'} ~ ${f.max ?? '+∞'}`
                : '';
            lines.push(
                `| \`${f.key}\` | ${label}${note}${ph}${range} | ${TYPE_LABEL[f.type] || f.type} | ${formatDefault(f)} | ${f.requiresRestart ? '是' : '否'} |`
            );
        }
        lines.push('');
    }

    lines.push('---');
    lines.push('');
    lines.push('## 敏感字段加密');
    lines.push('');
    lines.push('以下字段在落盘时会自动加密（格式 `enc:v1:<base64>`）：');
    lines.push('');
    lines.push('`password`、`token`、`cookie`');
    lines.push('');
    lines.push('**加密方案**：AES-256-GCM + scrypt 派生密钥，密钥材料为「机器名 + 用户名 + 用户域 + 应用盐」。');
    lines.push('');
    lines.push('| 能防 | 不能防 |');
    lines.push('|---|---|');
    lines.push('| 配置文件被拷到别的机器/用户后解密 | 本机同用户的恶意程序 |');
    lines.push('| 随手打开文件看到明文密码 | 内存取证 |');
    lines.push('');
    lines.push('> 换机器后密文无法解密，对应字段会返回空值（不会崩溃），重新填写即可。');
    lines.push('> 非桌面端环境（如 CLI）没有加密能力，读取时会降级为空值。');
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 修改方式');
    lines.push('');
    lines.push('1. **桌面端设置页**（推荐）：右键托盘区域已移除，使用应用内「设置」或首启引导');
    lines.push('2. **直接编辑** `config.json`：修改后重启应用生效（标记「需重启」的字段）');
    lines.push('3. **HTTP 接口**：`GET /api/config` 读取、`POST /api/config` 写入（只接受 schema 中可见字段）');
    lines.push('');
    return lines.join('\n');
}

const content = build();

if (process.argv.includes('--check')) {
    const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
    if (existing.trim() !== content.trim()) {
        console.error('✗ docs/CONFIG.md 与 schema 不一致，请运行: node scripts/gen-config-doc.mjs');
        process.exit(1);
    }
    console.log('✓ docs/CONFIG.md 与 schema 一致');
    process.exit(0);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, content, 'utf8');
console.log('✓ 已生成', OUT);
