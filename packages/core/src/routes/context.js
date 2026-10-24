'use strict';

/**
 * 路由层共享上下文
 *
 * createServer 负责装配依赖，把需要的能力集中到 context 对象，
 * 各 routes/*.js 只依赖这个对象，不再各自 require express/store/crawler。
 */

/**
 * @typedef {object} RouteContext
 * @property {object} manifest
 * @property {object} config        用户配置（含 get/setValue/trigger）
 * @property {object} store         数据库访问
 * @property {object} crawler       爬虫
 * @property {object} taskManager   任务管理
 * @property {object} message       消息分发
 * @property {string} api           API 前缀（默认 /api）
 * @property {string} fileUri       文件代理前缀
 * @property {string} hp            首页路径
 * @property {string} workspace     工作目录
 * @property {Function} wrapHandler 异步包装
 * @property {Function} fmtDate
 * @property {Function} toFileUrl
 * @property {Function} rewriteComicMediaUrls
 * @property {Function} sendMessage
 * @property {Function} buildZipStatusMap
 * @property {Function} getWebEmbedded
 * @property {Function} setStaticMounted
 */

/** 统一包装 async handler，消除重复 try/catch */
function wrapHandler(fn) {
    return async (req, res, next) => {
        try {
            await fn(req, res, next);
        } catch (e) {
            next(e);
        }
    };
}

function fmtDate(ts) {
    const n = Number(ts);
    if (!Number.isFinite(n)) return String(ts || '');
    const d = new Date(n * 1000);
    const Y = d.getFullYear();
    const M = String(d.getMonth() + 1).padStart(2, '0');
    const D = String(d.getDate()).padStart(2, '0');
    return `${Y}-${M}-${D}`;
}

/** 把远端图片 URL 转为同源路径 */
function createToFileUrl({config, fileUri, cdn2OriginUrl, url2DataPath}) {
    return function toFileUrl(originUrl) {
        let url = String(originUrl || '').trim();
        url = cdn2OriginUrl(url, config.host, config.cdnHosts);
        const dataPath = url2DataPath(url, '');
        return `${fileUri}${dataPath}?originUrl=${encodeURIComponent(originUrl)}`;
    };
}

/** 将漫画 JSON 中的封面/详情/缩略图资源改为同源代理 URL */
function createRewriteComicMediaUrls({config, toFileUrl}) {
    return function rewriteComicMediaUrls(c) {
        if (!c) return c;
        const o = {...c};
        const cdnHost = config.cdnHosts[Math.floor(Math.random() * config.cdnHosts.length)];
        o.cover = o.cover || `${cdnHost}/media/albums/${c.id}.jpg`;
        if (o.cover.startsWith('/media')) {
            o.cover = `${cdnHost}${o.cover}`;
        }
        if (o.cover) o.cover = toFileUrl(o.cover);
        if (Array.isArray(o.zoomImages)) o.zoomImages = o.zoomImages.map((x) => toFileUrl(x));
        if (Array.isArray(o.images)) o.images = o.images.map((x) => toFileUrl(x));
        return o;
    };
}

module.exports = {
    wrapHandler,
    fmtDate,
    createToFileUrl,
    createRewriteComicMediaUrls,
};
