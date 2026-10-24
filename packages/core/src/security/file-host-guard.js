'use strict';

/**
 * /file 代理的域名白名单
 *
 * 背景：/file 会把 originUrl 参数指向的任意 http(s) 资源抓取并落盘，
 * 若不限制，可被用作 SSRF（读取内网服务、探测端口等）。
 *
 * 策略：
 * 1、协议仅允许 http / https
 * 2、主机名必须在白名单内（精确匹配或子域匹配）
 * 3、白名单来自配置：host / cdnHosts / apiHosts 的域名 + 内置站点域名
 * 4、拒绝 IP 直连、localhost、内网段（即使被误加入白名单）
 */

/** 内置允许的站点域名（与 config.host / cdnHosts / apiHosts 合并） */
const BUILTIN_HOSTS = [
    '18comic.vip',
    '18comic.org',
    'jmcomic.me',
    'cdngwc.cc',
    'cdngwc.net',
    'cdngwc.club',
    'cdnhjk.net',
    'cdnmsp.com',
    'cdnmsp2.com',
    'cdnmsp3.com',
    'jmapiproxy.com',
];

/** 明显的内网/本机主机名 */
const BLOCKED_HOSTNAMES = new Set([
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '[::1]',
    'metadata.google.internal',
]);

/** 从 URL 配置项中提取主机名 */
function hostnameOf(value) {
    const s = String(value || '').trim();
    if (!s) return '';
    try {
        const u = new URL(s.includes('://') ? s : `https://${s}`);
        return u.hostname.toLowerCase();
    } catch {
        return '';
    }
}

/**
 * 判断主机名是否为 IP 字面量（IPv4 / 括号包裹的 IPv6）
 * 注意：不做 DNS 解析，因此无法防御"域名解析到内网"的高级场景；
 * 该风险通过白名单（只允许已知站点域名）而非 IP 过滤来规避。
 */
function isIpLiteral(hostname) {
    if (!hostname) return false;
    if (/^\d{1,3}(\.\d{1,3}){3}$/.test(hostname)) return true;
    if (hostname.startsWith('[') || hostname.includes(':')) return true;
    return false;
}

/** 是否为私有/保留 IPv4 段 */
function isPrivateIpv4(hostname) {
    const m = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (!m) return false;
    const [a, b] = [Number(m[1]), Number(m[2])];
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 0) return true;
    return false;
}

/**
 * 构建白名单校验器
 * @param {object} config 用户配置（读取 host / cdnHosts / apiHosts / allowedFileHosts）
 * @param {object} [opts]
 * @param {string[]} [opts.extraHosts] 额外允许的域名
 * @return {(url:string)=>{ok:boolean, reason?:string, hostname?:string}}
 */
function createFileHostGuard(config = {}, opts = {}) {
    const allow = new Set();

    const add = (v) => {
        const h = hostnameOf(v);
        if (h) allow.add(h);
    };

    for (const h of BUILTIN_HOSTS) add(h);
    add(config.host);
    for (const h of (Array.isArray(config.cdnHosts) ? config.cdnHosts : [])) add(h);
    for (const h of (Array.isArray(config.apiHosts) ? config.apiHosts : [])) add(h);
    for (const h of (Array.isArray(config.allowedFileHosts) ? config.allowedFileHosts : [])) add(h);
    for (const h of (Array.isArray(opts.extraHosts) ? opts.extraHosts : [])) add(h);

    /**
     * 主机名是否命中白名单（精确或子域）
     * 例如白名单含 18comic.vip，则 img.18comic.vip 也允许
     */
    function matches(hostname) {
        if (allow.has(hostname)) return true;
        for (const base of allow) {
            if (hostname.endsWith(`.${base}`)) return true;
        }
        return false;
    }

    return function check(rawUrl) {
        let url;
        try {
            url = new URL(String(rawUrl || ''));
        } catch {
            return {ok: false, reason: 'URL 无效'};
        }

        if (url.protocol !== 'http:' && url.protocol !== 'https:') {
            return {ok: false, reason: `不支持的协议：${url.protocol}`};
        }

        const hostname = url.hostname.toLowerCase();

        if (BLOCKED_HOSTNAMES.has(hostname)) {
            return {ok: false, reason: `禁止访问本机地址：${hostname}`, hostname};
        }
        if (isIpLiteral(hostname)) {
            if (isPrivateIpv4(hostname)) {
                return {ok: false, reason: `禁止访问内网地址：${hostname}`, hostname};
            }
            // 公网 IP 也不在白名单策略内（白名单只收域名）
            return {ok: false, reason: `禁止直接使用 IP 访问：${hostname}`, hostname};
        }
        if (!matches(hostname)) {
            return {ok: false, reason: `域名不在白名单：${hostname}`, hostname};
        }
        return {ok: true, hostname};
    };
}

module.exports = {
    BUILTIN_HOSTS,
    BLOCKED_HOSTNAMES,
    createFileHostGuard,
    hostnameOf,
    isIpLiteral,
    isPrivateIpv4,
};
