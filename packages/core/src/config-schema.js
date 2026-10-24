'use strict'

/**
 * 配置项唯一来源（Single Source of Truth）
 *
 * 桌面端首启引导、Web 设置页、CLI config 命令都从这里渲染，
 * 服务端的 /api/config 读写也以此白名单校验，避免三处各写一套字段。
 *
 * 字段说明：
 *   key            配置键名（写入 config.json）
 *   label          UI 显示名
 *   type           string | password | number | boolean | string[] | dir | file
 *   group          basic | network | advanced（UI 分组）
 *   default        默认值（可为函数，运行时求值）
 *   hidden         true = 不参与 UI 渲染（内部字段）
 *   requiresRestart true = 修改后需要重启应用生效
 *   placeholder    输入框占位符
 *   min/max        number 类型范围
 */
const FIELDS = [
    // ── 基本设置 ───────────────────────────────────────────────
    {
        key: 'username',
        label: '用户名',
        type: 'string',
        group: 'basic',
        default: '',
        placeholder: '输入 JM 账号',
    },
    {
        key: 'password',
        label: '密码',
        type: 'password',
        group: 'basic',
        default: '',
        placeholder: '输入 JM 密码',
    },
    {
        key: 'dataDir',
        label: '数据目录',
        type: 'dir',
        group: 'basic',
        default: null, // 由 config.js 注入 appDataDir()/data
        requiresRestart: true,
        placeholder: '如 D:\\JM_Data',
    },
    {
        key: 'port',
        label: '端口',
        type: 'number',
        group: 'basic',
        default: 47310,
        requiresRestart: true,
        min: 1024,
        max: 65535,
    },
    {
        key: 'listenHost',
        label: '监听地址',
        type: 'string',
        group: 'network',
        default: '127.0.0.1',
        requiresRestart: true,
        placeholder: '127.0.0.1（默认，仅本机）或 0.0.0.0（允许局域网访问）',
    },
    {
        key: 'comicViewer',
        label: '漫画阅读器',
        type: 'file',
        group: 'basic',
        default: 'linux' === process.platform ? '' : 'C:\\Program Files\\ComicRack\\ComicRack.exe',
        placeholder: 'C:\\Program Files\\...',    },

    // ── 网络设置 ───────────────────────────────────────────────
    {
        key: 'host',
        label: 'JM 主站',
        type: 'string',
        group: 'network',
        default: 'https://18comic.vip',
        requiresRestart: true,
    },
    {
        key: 'cdnHosts',
        label: 'CDN 域名',
        type: 'string[]',
        group: 'network',
        default: [
            'https://cdn-msp.18comic.vip',
            'https://cdn-msp2.18comic.vip',
            'https://cdn-msp3.18comic.vip',
        ],
        placeholder: '输入 CDN 域名后回车',
    },
    {
        key: 'apiHosts',
        label: 'API 域名',
        type: 'string[]',
        group: 'network',
        default: [
            'https://www.cdnhjk.net',
            'https://www.cdngwc.cc',
            'https://www.cdngwc.net',
            'https://www.cdngwc.club',
        ],
        placeholder: '输入 API 域名后回车',
    },
    {
        key: 'timeout',
        label: '请求超时（ms）',
        type: 'number',
        group: 'network',
        default: 86400000,
        min: 1000,
    },
    {
        key: 'proxy',
        label: '代理地址',
        type: 'string',
        group: 'network',
        default: null,
        requiresRestart: true,
        placeholder: 'http://127.0.0.1:10809',
    },

    // ── 高级设置 ───────────────────────────────────────────────
    {
        key: 'debug',
        label: '启用调试日志',
        type: 'boolean',
        group: 'advanced',
        default: false,
        requiresRestart: true,
    },
    {
        key: 'toast',
        label: '下载完成后弹出系统通知',
        type: 'boolean',
        group: 'advanced',
        default: false,
    },

    // ── 内部字段（不参与 UI）────────────────────────────────────
    { key: 'token', label: '登录 Token', type: 'string', group: 'internal', default: '', hidden: true },
    { key: 'cookie', label: '登录 Cookie', type: 'string', group: 'internal', default: '', hidden: true },
    { key: 'memberInfo', label: '会员信息', type: 'object', group: 'internal', default: null, hidden: true },
    { key: 'harmony', label: '和谐模式', type: 'boolean', group: 'internal', default: false, hidden: true },
    { key: 'harmonyThreshold', label: '和谐阈值', type: 'number', group: 'internal', default: 50, hidden: true },
    { key: 'harmonyUseCover', label: '和谐使用封面图', type: 'boolean', group: 'internal', default: false, hidden: true },
    { key: 'setupCompleted', label: '已完成首启引导', type: 'boolean', group: 'internal', default: false, hidden: true },
];

/** 按 key 索引 */
const FIELD_MAP = Object.freeze(
    FIELDS.reduce((acc, f) => { acc[f.key] = f; return acc }, {})
);

/** 参与 UI 渲染的字段 */
function visibleFields() {
    return FIELDS.filter((f) => !f.hidden)
}

/** 按 group 分组的可见字段 */
function fieldsByGroup() {
    const out = { basic: [], network: [], advanced: [] }
    for (const f of visibleFields()) {
        if (out[f.group]) out[f.group].push(f)
    }
    return out
}

/** 生成默认配置对象 */
function buildDefaults(dataDirFallback) {
    const out = {}
    for (const f of FIELDS) {
        let v = typeof f.default === 'function' ? f.default() : f.default
        if (f.key === 'dataDir' && v == null) v = dataDirFallback
        // 深拷贝数组，避免多处共享同一引用
        out[f.key] = Array.isArray(v) ? [...v] : v
    }
    return out
}

/**
 * 按 schema 校验并转换单个值。
 * @returns {{ok: true, value: *} | {ok: false, message: string}}
 */
function coerceValue(field, raw) {
    if (!field) return { ok: false, message: '未知配置项' }
    switch (field.type) {
        case 'boolean':
            return { ok: true, value: !!raw }
        case 'number': {
            const n = Number(raw)
            if (!Number.isFinite(n)) return { ok: false, message: `${field.label} 必须是数字` }
            if (field.min != null && n < field.min) return { ok: false, message: `${field.label} 不能小于 ${field.min}` }
            if (field.max != null && n > field.max) return { ok: false, message: `${field.label} 不能大于 ${field.max}` }
            return { ok: true, value: n }
        }
        case 'string[]': {
            const arr = Array.isArray(raw)
                ? raw
                : String(raw ?? '').split(/[\n,]/)
            const cleaned = arr.map((s) => String(s).trim()).filter(Boolean)
            return { ok: true, value: cleaned }
        }
        case 'object':
            return { ok: true, value: raw ?? null }
        case 'password':
        case 'dir':
        case 'file':
        case 'string':
        default: {
            const s = raw == null ? '' : String(raw)
            return { ok: true, value: s }
        }
    }
}

module.exports = {
    FIELDS,
    FIELD_MAP,
    visibleFields,
    fieldsByGroup,
    buildDefaults,
    coerceValue,
}
