'use strict';

const fs = require('node:fs');
const path = require('node:path');
const {spawn, exec} = require('node:child_process');
const PQueue = require('p-queue').default;
const express = require('express');
const expressWs = require('express-ws');
const compression = require('compression');

const {writeToFileSync, isNotEmptySync, mkdirSyncIfNotExists} = require('../util/file');
const {getMime, cdn2OriginUrl, url2DataPath} = require('../util/http');

/** 构建时由 webpack 替换为 dist/bundles/jm.bundle/web-embedded.json；缺失或非对象时走磁盘 web/dist */
const webEmbedded = (() => {
    try {
        return require('./web-embedded.json');
    } catch {
        return {};
    }
})();

/**
 * JM 模块 HTTP 服务：静态页、/file 缓存、REST API、下载进度 WebSocket
 * @param manifest      JM 模块应用配置（manifest.json）
 * @param ctx           宿主上下文
 * @param message     JM 模块消息分发器
 * @param config      用户配置（config.json）
 * @param store       数据库访问
 * @param crawler     爬虫与下载队列
 * @param taskManager 任务管理器
 */
function createServer(manifest, ctx, message, config, store, crawler, taskManager) {
    const {workspace} = manifest;
    let _server;
    /** 本地 file 缓存 URL 前缀 */
    const FILE_URI = '/file';
    const fileQueue = new PQueue({concurrency: 10});
    /** @type {Set<import('ws')>} */
    const progressClients = new Set();
    message.dispatchers.serverState = (payload) => {
        // 旧的下载进度同步已移除 — taskManager 承担全部任务管理
    };

    /** 浏览器打开首页时的 origin，用于把站点图片 URL 改写为同源代理 */
    let serverOrigin = '';
    let staticMounted = false;
    const port = Number(config.port) || 47310;
    const host = '0.0.0.0';
    const hp = "/index.html";
    const listenHost = host === '0.0.0.0' ? '127.0.0.1' : host;
    serverOrigin = `http://${listenHost}:${port}`;
    let homeUrl = `${serverOrigin}${hp.startsWith('/') ? hp : `/${hp}`}`;

    function fmtDate(ts) {
        const n = Number(ts);
        if (!Number.isFinite(n)) return String(ts || '');
        const d = new Date(n * 1000);
        const Y = d.getFullYear();
        const M = String(d.getMonth() + 1).padStart(2, '0');
        const D = String(d.getDate()).padStart(2, '0');
        return `${Y}-${M}-${D}`;
    }

    function handleJmConfig(app, api) {
        app.post(`${api}/jm-config`, (req, res) => {
            try {
                const tmpl =
                    manifest?.config?.template && typeof manifest.config.template === 'object'
                        ? manifest.config.template
                        : {};
                const allowed = new Set(Object.keys(tmpl));
                const body = req.body && typeof req.body === 'object' && !Array.isArray(req.body) ? req.body : {};
                for (const key of Object.keys(body)) {
                    if (!allowed.has(key)) continue;
                    config.setValue(key, body[key]);
                }
                res.json({ok: true});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    /**
     * 将远端图片 URL 转为同源路径：`{origin}/{host}/path?originUrl=`，由下方中间件拉取
     * @param {string} originUrl 完整 https URL
     */
    function toFileUrl(originUrl) {
        let url = String(originUrl || '').trim();
        // 1、先转换统一 URL
        url = cdn2OriginUrl(url, config.host, config.cdnHosts);
        // 2、转换为文件路径（不用加/file）
        let dataPath = url2DataPath(url, "");
        return `${FILE_URI}${dataPath}?originUrl=${encodeURIComponent(originUrl)}`;
    }

    /** 将漫画 JSON 中的封面、详情 HTML、缩略图列表中的 http(s) 资源改为同源代理 URL */
    function rewriteComicMediaUrls(c) {
        if (!c) return c;
        const o = {...c};
        // 设置默认封面
        let cdnHost = config.cdnHosts[Math.floor(Math.random() * config.cdnHosts.length)];
        o.cover = o.cover || `${cdnHost}/media/albums/${c.id}.jpg`;
        if (o.cover.startsWith('/media')) {
            o.cover = `${cdnHost}${o.cover}`;
        }
        if (o.cover) o.cover = toFileUrl(o.cover);
        if (Array.isArray(o.zoomImages)) o.zoomImages = o.zoomImages.map((x) => toFileUrl(x));
        if (Array.isArray(o.images)) o.images = o.images.map((x) => toFileUrl(x));
        return o;
    }

    /** 向所有已连接前端推送一条 JSON（与爬虫 dispatch 的 payload 一致，由前端自行解析） */
    let _lastProgressSend = 0;
    let _pendingProgress = null;
    let _progressTimer = null;
    function sendMessage(payload) {
        if (payload && typeof payload === 'object' && payload.type === 'progress') {
            const now = Date.now();
            if (now - _lastProgressSend < 200) {
                _pendingProgress = payload;
                if (!_progressTimer) {
                    _progressTimer = setTimeout(() => {
                        _progressTimer = null;
                        if (_pendingProgress) {
                            const p = _pendingProgress;
                            _pendingProgress = null;
                            _lastProgressSend = Date.now();
                            const s = JSON.stringify(p);
                            for (const ws of progressClients) {
                                try { ws.send(s); } catch { /* */ }
                            }
                        }
                    }, 200 - (now - _lastProgressSend));
                }
                return;
            }
            _lastProgressSend = now;
            _pendingProgress = null;
        }

        // non-progress: clear stale pending progress to avoid overwriting terminal state
        if (!(payload?.type === 'progress')) {
            if (_progressTimer) { clearTimeout(_progressTimer); _progressTimer = null; }
            _pendingProgress = null;
        }

        const s = typeof payload === 'string' ? payload : JSON.stringify(payload);
        for (const ws of progressClients) {
            try {
                ws.send(s);
            } catch {
                /* */
            }
        }
    }

    /** taskManager 已接管所有任务管理 — 移除旧 STEP_CN / formatDownloadTaskProgress / mapProgressToZipDownload */

    /** 为详情接口组装各分册 ZIP 的存在性与下载进度 */
    async function buildZipStatusMap(comicJson) {
        const z = {};
        const eps = Array.isArray(comicJson.series) && comicJson.series.length ? comicJson.series : null;
        const nums = eps
            ? eps.map((e) => Number(e.id)).filter((n) => Number.isFinite(n))
            : [];
        const comicDir = path.join(config.dataDir, 'comic');
        for (const n of nums) {
            const sk = String(n);
            const zipPath = path.join(comicDir, `${n}.zip`);
            const dl = taskManager ? taskManager.getZipDownloadStatus(n) : null;
            z[sk] = {
                exists: isNotEmptySync(zipPath),
                download: dl,
            };
        }
        if (!eps) {
            const sk = String(comicJson.id);
            z[sk] = {
                exists: isNotEmptySync(path.join(comicDir, `${comicJson.id}.zip`)),
                download: taskManager ? taskManager.getZipDownloadStatus(Number(comicJson.id)) : null,
            };
        }
        return z;
    }

    function handleProgressWs(app, api) {
        app.ws(`${api}/ws`, (ws) => {
            progressClients.add(ws);

            // 连接时下发任务列表与状态定义
            if (taskManager) {
                ws.send(JSON.stringify({
                    type: 'init',
                    tasks: taskManager.getTasks(),
                    statuses: taskManager.getStatuses(),
                }));
            }

            ws.on('message', (raw) => {
                if (!taskManager) return;
                try {
                    const msg = JSON.parse(raw.toString());
                    if (msg.type === 'ping') return;
                    taskManager.handleWSMessage(msg);
                } catch (_) { /* 忽略无法解析的消息 */
                }
            });

            ws.on('close', () => progressClients.delete(ws));
        });
    }

    function handleStatic(app) {
        const emb = webEmbedded && typeof webEmbedded === 'object' && Object.keys(webEmbedded).length > 0;
        if (emb) {
            staticMounted = true;
            app.use((req, res, next) => {
                // ✅ API 直接跳过
                if (req.path.startsWith('/api/')) {
                    return next();
                }

                if (req.method !== 'GET' && req.method !== 'HEAD') return next();

                let p = decodeURIComponent(req.path.replace(/^\/+/, '')) || 'index.html';
                if (p.endsWith('/')) p += 'index.html';

                let b64 = webEmbedded[p];
                if (!b64 && !path.extname(p)) b64 = webEmbedded['index.html'];
                if (!b64) return next();

                res.setHeader('Content-Type', getMime(p));
                res.send(Buffer.from(b64, 'base64')).end();
            });
            return;
        }

        // ✅ 兜底：使用磁盘 web/dist（兼容 monorepo 和 flat 结构）
        staticMounted = true;
        const webDist = fs.existsSync(path.join(workspace, 'packages', 'web', 'dist'))
            ? path.join(workspace, 'packages', 'web', 'dist')
            : path.join(workspace, 'web', 'dist');
        app.use(express.static(webDist));
        app.get(hp, (_req, res) => {
            res.status(503).type('text/plain; charset=utf-8').send(
                'JM 前端未安装：请用 npm run build:bundles 重新发布，或从镜像重新下载。'
            ).end();
        });
    }

    /**
     * /file 下挂本地 dataDir/file；缺失时按 query.originUrl 从站点拉取并落盘
     */
    function handleStaticFile(app) {
        app.use(FILE_URI, express.static(path.resolve(`${config.dataDir}/file`), {
            maxAge: '30d',
            etag: false,
            lastModified: false,
            fallthrough: true, // 必须
        }));
        app.use(FILE_URI, (req, res) => {
            let originUrl = req.query.originUrl;
            if (!originUrl) {
                const rel = req.path.replace(/^\/+/, '');
                originUrl = `https://${rel}`;
            }
            if (!originUrl.startsWith('http')) {
                originUrl = `https:${originUrl}`;
            }
            void fileQueue.add(async () => {
                try {
                    const abs = await crawler.fetchRemoteFile(originUrl);
                    if (!abs || !fs.existsSync(abs) || !isNotEmptySync(abs)) {
                        res.status(404).end();
                        return;
                    }
                    res.setHeader('Content-Type', getMime(abs) || 'application/octet-stream');
                    res.setHeader('Cache-Control', 'public, max-age=86400');
                    fs.createReadStream(abs).pipe(res);
                } catch (err) {
                    console.error('[server]', err);
                    if (!res.headersSent) res.status(500).end();
                }
            });
        });
    }


    function handleSettings(app, api) {
        app.get(`${api}/settings`, (_req, res) => {
            const bundleConfig = typeof config.get === 'function' ? config.get() : {...config};
            res.json({
                ok: true,
                bundleConfig
            });
        });
        app.put(`${api}/settings`, (req, res) => {
            try {
                const body = req.body || {};
                const bc = body.bundleConfig;
                if (bc && typeof bc === 'object') {
                    for (const [k, v] of Object.entries(bc)) {
                        config.setValue(k, v);
                    }
                    config.trigger(manifest);
                }
                res.json({ok: true});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleSync(app, api) {
        app.post(`${api}/sync/local2db`, async (_req, res) => {
            try {
                store.runLocal2Db();
                res.json({ok: true});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.post(`${api}/sync/db2local`, async (_req, res) => {
            try {
                store.runDb2Local();
                res.json({ok: true});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.post(`${api}/sync/rebuild-cache`, async (_req, res) => {
            try {
                await store.comicMeta.syncAllTags();
                await store.comicMeta.syncAllAuthors();
                res.json({ok: true});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    /** 标签搜索结果缓存（key=查询词，value={tags, expireAt}） */
    const tagsCache = new Map();
    const worksCache = new Map();
    const TAGS_CACHE_TTL = 5 * 60 * 1000; // 5 分钟
    const TAGS_CACHE_MAX = 100; // 最多缓存 100 个查询

    function handleTags(app, api) {
        app.get(`${api}/tags`, async (req, res) => {
            try {
                const query = String(req.query.query || '').trim();

                // 为空时，返回空数组
                if (!query) {
                    res.json({ok: true, tags: []}).end();
                    return;
                }

                // 检查缓存
                const now = Date.now();
                const cached = tagsCache.get(query);
                if (cached && cached.expireAt > now) {
                    res.json({ok: true, tags: cached.tags, fromCache: true}).end();
                    return;
                }

                // 查询标签
                let tags = await store.comicMeta.listTags(query);

                // 去重、过滤空值、排序
                tags = [...new Set(tags)]
                    .filter((tag) => tag && tag.trim())
                    .sort((a, b) => a.localeCompare(b))
                    .slice(0, 50); // 最多返回 50 个标签

                // 更新缓存
                tagsCache.set(query, {tags, expireAt: now + TAGS_CACHE_TTL});

                // 清理过期缓存
                if (tagsCache.size > TAGS_CACHE_MAX) {
                    for (const [key, value] of tagsCache.entries()) {
                        if (value.expireAt <= now) {
                            tagsCache.delete(key);
                        }
                    }
                }

                res.json({ok: true, tags, fromCache: false}).end();
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });

        app.get(`${api}/works`, async (req, res) => {
            try {
                const query = String(req.query.query || '').trim();
                if (!query) {
                    res.json({ok: true, works: []}).end();
                    return;
                }
                const now = Date.now();
                const cached = worksCache.get(query);
                if (cached && cached.expireAt > now) {
                    res.json({ok: true, works: cached.works, fromCache: true}).end();
                    return;
                }
                let works = await store.comicMeta.listWorks(query);
                works = [...new Set(works)]
                    .filter((w) => w && w.trim())
                    .sort((a, b) => a.localeCompare(b))
                    .slice(0, 50);
                worksCache.set(query, {works, expireAt: now + TAGS_CACHE_TTL});
                if (worksCache.size > TAGS_CACHE_MAX) {
                    for (const [key, value] of worksCache.entries()) {
                        if (value.expireAt <= now) worksCache.delete(key);
                    }
                }
                res.json({ok: true, works, fromCache: false}).end();
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });

        app.get(`${api}/actors`, async (req, res) => {
            try {
                const query = String(req.query.query || '').trim();
                if (!query) {
                    res.json({ok: true, actors: []}).end();
                    return;
                }
                const actors = await store.comicMeta.listActors(query);
                res.json({ok: true, actors}).end();
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleComicsList(app, api) {
    const sortMap = {
      id: 'id',
      name: 'name',
      total_views: 'total_views',
      likes: 'likes',
      addtime: 'addtime',
      create_time: 'create_time',
      update_time: 'update_time',
    };
        app.get(`${api}/comics`, async (req, res) => {
            try {
                const qo = {
                    name: String(req.query.title || req.query.name || '').trim(),
                    author: String(req.query.author || '').trim(),
                    id: String(req.query.number || req.query.id || '').trim(),
                    tags: String(req.query.tags || '').trim(),
                    works: String(req.query.works || '').trim(),
                    actors: String(req.query.actors || '').trim(),
                    kind: String(req.query.kind || '').trim(),
                    banned: String(req.query.banned || '').trim(),
                    starred: String(req.query.starred || '').trim(),
                    sort: sortMap[String(req.query.sort || 'update_time')] || 'update_time',
                    order: String(req.query.order || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC',
                    page: Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1),
                    pageSize: Math.min(50, Math.max(1, parseInt(String(req.query.pageSize || '10'), 10) || 10)),
                    availDir: req.query.available === 'true' ? path.join(config.dataDir, 'comic') : null,
                };
                const {total, rows} = await store.comicMeta.page(qo);
                const comicDir = path.join(config.dataDir, 'comic');
                const list = rows.map((row) => {
                    const j = rewriteComicMediaUrls(store.dbRowToJson(row));
                    j.canRead = isNotEmptySync(path.join(comicDir, `${j.id}.zip`));
                    return j;
                });
                res.json({ok: true, list, total});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleFetchMeta(app, api) {
        app.post(`${api}/comics/:num/fetch-meta`, async (req, res) => {
            try {
                const n = Math.floor(Number(req.params.num));
                const info = await crawler.comic.getMeta(n);
                if (!info) {
                    res.json({ok: false, message: '无可用信息或 JM 编码无效'});
                    return;
                }
                await store.comicMeta.saveOrUpdate(store.jsonRowToDb(info));
                const row = await store.comicMeta.get(n);
                const comic = row ? rewriteComicMediaUrls(store.dbRowToJson(row)) : null;
                if (!comic) {
                    res.json({ok: false, message: '获取信息失败'});
                    return;
                }
                const eps = Array.isArray(comic.series) && comic.series.length ? comic.series : [];
                const comicDir = path.join(config.dataDir, 'comic');
                const allSeries = eps.map(e => {
                    const en = Number(e.id);
                    return {
                        id: String(e.id),
                        name: String(e.name || ''),
                        done: isNotEmptySync(path.join(comicDir, `${en}.zip`))
                    };
                });
                comic.series = allSeries;
                const singleDone = allSeries.length === 0 && isNotEmptySync(path.join(comicDir, `${n}.zip`));
                const allDone = (allSeries.length > 0 && allSeries.every(e => e.done)) || singleDone;
                const zipStatus = {};
                for (const ep of allSeries) {
                    zipStatus[String(ep.id)] = { exists: ep.done };
                }
                if (allSeries.length === 0) {
                    zipStatus[String(n)] = { exists: singleDone };
                }
                res.json({
                    ok: true,
                    comic,
                    zipStatus,
                    allDone,
                });
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleComicDetail(app, api) {
        app.get(`${api}/comics/:num`, async (req, res) => {
            try {
                const n = Math.floor(Number(req.params.num));
                const row = await store.comicMeta.get(n);
                if (!row) {
                    res.json({ok: false, message: '未找到漫画'});
                    return;
                }
                const comic = rewriteComicMediaUrls(store.dbRowToJson(row));
                const eps = Array.isArray(comic.series) && comic.series.length ? comic.series : [];
                const comicDir = path.join(config.dataDir, 'comic');
                comic.series = eps.map(e => {
                    const en = Number(e.id);
                    return { id: String(e.id), name: String(e.name || ''), done: isNotEmptySync(path.join(comicDir, `${en}.zip`)) };
                });
                const zipStatus = await buildZipStatusMap(comic);
                res.json({ok: true, comic, zipStatus});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleComicSearch(app, api) {
        app.get(`${api}/search/comics`, async (req, res) => {
            try {
                const keyword = String(req.query.keyword || '').trim();
                if (!keyword) {
                    res.json({ok: false, message: '请输入搜索关键词'});
                    return;
                }
                const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
                const sort = String(req.query.sort || '');
                const result = await crawler.search.byKeyword(keyword, page, sort);
                const comicDir = path.join(config.dataDir, 'comic');
                const list = await Promise.all((result.content || []).map(async (item) => {
                    const id = Number(item.id);
                    const dbRow = await store.comicMeta.get(id);
                    const o = {
                        ...item,
                        id,
                        name: String(item.name || ''),
                        cover: String(item.image || ''),
                        author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                        description: String(item.description || ''),
                        total_views: String(item.total_views ?? ''),
                        likes: String(item.likes ?? ''),
                        kind: String((item.category || {}).title || (item.category_sub || {}).title || ''),
                        displayKindLabel: String((item.category_sub || {}).title || (item.category || {}).title || ''),
                        updateDate: item.update_at ? fmtDate(item.update_at) : '',
                        inStore: !!dbRow,
                        canRead: isNotEmptySync(path.join(comicDir, `${id}.zip`)),
                    };
                    return rewriteComicMediaUrls(o);
                }));
                res.json({ok: true, list, total: result.total || 0, pages: result.pages || 1});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.get(`${api}/search/hot-tags`, async (req, res) => {
            try {
                const list = await crawler.search.hotTags();
                res.json({ok: true, list});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.get(`${api}/search/random-recommend`, async (req, res) => {
            try {
                const list = await crawler.search.randomRecommend();
                const comicDir = path.join(config.dataDir, 'comic');
                const items = (list || []).map((item) => {
                    const id = Number(item.id);
                    const o = {
                        id,
                        name: String(item.name || ''),
                        cover: String(item.image || ''),
                        author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                        description: String(item.description || ''),
                        category: item.category || null,
                        category_sub: item.category_sub || null,
                        liked: !!item.liked,
                        is_favorite: !!item.is_favorite,
                        update_at: item.update_at || 0,
                        inStore: isNotEmptySync(path.join(config.dataDir, 'info', `${id}.json`)),
                        canRead: isNotEmptySync(path.join(comicDir, `${id}.zip`)),
                    };
                    return rewriteComicMediaUrls(o);
                });
                res.json({ok: true, list: items});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleWeekInfo(app, api) {
        app.get(`${api}/week/info`, async (req, res) => {
            try {
                const info = await crawler.rank.weekInfo();
                res.json({ok: true, categories: info?.categories || [], type: info?.type || []});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleWeekComics(app, api) {
        app.get(`${api}/week/comics`, async (req, res) => {
            try {
                const categoryId = String(req.query.categoryId || '');
                const typeId = req.query.typeId ? String(req.query.typeId) : null;
                if (!categoryId) {
                    res.json({ok: false, message: '缺少期数参数'});
                    return;
                }
                const result = await crawler.rank.weekly(categoryId, typeId);
                const comicDir = path.join(config.dataDir, 'comic');
                const list = (result?.list || []).map((item) => {
                    const id = Number(item.id);
                    const o = {
                        ...item,
                        id,
                        name: String(item.name || ''),
                        cover: String(item.image || ''),
                        author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                        total_views: String(item.total_views ?? ''),
                        likes: String(item.likes ?? ''),
                        inStore: false,
                        canRead: false,
                    };
                    return rewriteComicMediaUrls(o);
                });
                // batch check store/zip
                await Promise.all(list.map(async (o) => {
                    const dbRow = await store.comicMeta.get(o.id);
                    o.inStore = !!dbRow;
                    o.canRead = isNotEmptySync(path.join(comicDir, `${o.id}.zip`));
                }));
                res.json({ok: true, list, total: result?.total || list.length});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleSerialComics(app, api) {
        app.get(`${api}/serial/comics`, async (req, res) => {
            try {
                const day = parseInt(req.query.day, 10) || 0;
                const page = parseInt(req.query.page, 10) || 1;
                const result = await crawler.rank.serialization(day, page);
                const comicDir = path.join(config.dataDir, 'comic');
                const list = (result?.list || []).map((item) => {
                    const id = Number(item.aid || item.id);
                    const o = {
                        ...item,
                        id,
                        name: String(item.title || item.name || ''),
                        cover: String(item.cover || item.image || ''),
                        author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                        total_views: String(item.views ?? ''),
                        likes: String(item.likes ?? ''),
                        inStore: false,
                        canRead: false,
                    };
                    return rewriteComicMediaUrls(o);
                });
                await Promise.all(list.map(async (o) => {
                    const dbRow = await store.comicMeta.get(o.id);
                    o.inStore = !!dbRow;
                    o.canRead = isNotEmptySync(path.join(comicDir, `${o.id}.zip`));
                }));
                const hasMore = !result?.error;
                res.json({ok: true, list, hasMore});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleLatestComics(app, api) {
        app.get(`${api}/latest/comics`, async (req, res) => {
            try {
                const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
                const result = await crawler.rank.latest(page);
                const comicDir = path.join(config.dataDir, 'comic');
                const list = (Array.isArray(result) ? result : []).map((item) => {
                    const id = Number(item.aid || item.id);
                    const o = {
                        ...item,
                        id,
                        name: String(item.title || item.name || ''),
                        cover: String(item.cover || item.image || ''),
                        author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                        total_views: String(item.views ?? ''),
                        likes: String(item.likes ?? ''),
                        inStore: false,
                        canRead: false,
                    };
                    return rewriteComicMediaUrls(o);
                });
                await Promise.all(list.map(async (o) => {
                    const dbRow = await store.comicMeta.get(o.id);
                    o.inStore = !!dbRow;
                    o.canRead = isNotEmptySync(path.join(comicDir, `${o.id}.zip`));
                }));
                res.json({ok: true, list, total: result?.total || list.length});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleFavorites(app, api) {
        app.get(`${api}/favorites/comics`, async (req, res) => {
            try {
                const page = Math.max(1, parseInt(req.query.page || '1', 10) || 1);
                const folderId = String(req.query.folder_id || '');
                const data = await crawler.account.getFavorites(page, folderId);
                const items = Array.isArray(data) ? data : (data?.list || data?.rows || []);
                const folders = data?.folder_list || [];
                const comicDir = path.join(config.dataDir, 'comic');
                const list = await Promise.all(items.map(async (item) => {
                    const id = Number(item.aid || item.id);
                    const o = {
                        ...item,
                        id,
                        name: String(item.title || item.name || ''),
                        cover: String(item.cover || item.image || ''),
                        author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                        total_views: String(item.views ?? item.total_views ?? ''),
                        likes: String(item.likes ?? ''),
                        inStore: false,
                        canRead: false,
                    };
                    const merged = rewriteComicMediaUrls(o);
                    const dbRow = await store.comicMeta.get(id);
                    merged.inStore = !!dbRow;
                    merged.canRead = isNotEmptySync(path.join(comicDir, `${id}.zip`));
                    return merged;
                }));
                res.json({ok: true, list, total: list.length, folders});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.get(`${api}/favorites/folders`, async (req, res) => {
            try {
                const data = await crawler.account.getFavorites(1);
                res.json({ok: true, folders: data?.folder_list || []});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.post(`${api}/favorites/comics/:num/toggle`, async (req, res) => {
            try {
                const num = Math.floor(Number(req.params.num));
                if (!Number.isFinite(num) || num < 1) {
                    res.status(400).json({ok: false, message: '无效编码'});
                    return;
                }
                const favorite = req.body?.favorite === true;
                if (favorite) {
                    await crawler.account.addFavorite(num);
                    const folderId = String(req.body?.folder_id || '').trim();
                    if (folderId) {
                        await crawler.account.moveToFolder(num, folderId, folderId);
                    }
                } else {
                    await crawler.account.removeFavorite(num);
                }
                res.json({ok: true, favorite});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.post(`${api}/favorites/folder`, async (req, res) => {
            try {
                const { action, folder_id, folder_name } = req.body || {};
                if (action === 'add') {
                    if (!folder_name) { res.status(400).json({ok: false, message: '请输入文件夹名称'}); return; }
                    await crawler.account.createFolder(folder_name);
                    res.json({ok: true});
                } else if (action === 'rename') {
                    if (!folder_id || !folder_name) { res.status(400).json({ok: false, message: '参数不完整'}); return; }
                    await crawler.account.renameFolder(folder_id, folder_name);
                    res.json({ok: true});
                } else if (action === 'del') {
                    if (!folder_id) { res.status(400).json({ok: false, message: '参数不完整'}); return; }
                    await crawler.account.deleteFolder(folder_id);
                    res.json({ok: true});
                } else {
                    res.status(400).json({ok: false, message: '无效操作'});
                }
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.post(`${api}/favorites/comics/move`, async (req, res) => {
            try {
                const { album_id, source_folder_id, target_folder_id } = req.body || {};
                if (!album_id || !target_folder_id) {
                    res.status(400).json({ok: false, message: '参数不完整'});
                    return;
                }
                let source = source_folder_id;
                if (!source) {
                    const allData = await crawler.account.getFavorites(1);
                    const folders = allData?.folder_list || [];
                    source = folders[0]?.FID;
                }
                if (!source) {
                    res.status(400).json({ok: false, message: '请先创建收藏夹'});
                    return;
                }
                await crawler.account.moveToFolder(album_id, source, target_folder_id);
                res.json({ok: true});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleAccountSign(app, api) {
        app.post(`${api}/account/sign`, async (_req, res) => {
            try {
                const result = await crawler.account.sign();
                res.json({ok: true, msg: result?.msg || '签到成功'});
            } catch (e) {
                res.json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleLogin(app, api) {
        app.post(`${api}/login`, async (req, res) => {
            try {
                const { username, password } = req.body || {}
                const u = (username || config.username || '').trim()
                const p = (password || config.password || '').trim()
                if (!u || !p) {
                    return res.json({ ok: false, message: '请输入用户名和密码' })
                }
                config.setValue('username', u)
                config.setValue('password', p)
                const result = await crawler.account.login()
                if (!result?.memberInfo) {
                    config.setValue('username', '')
                    config.setValue('password', '')
                    return res.json({ ok: false, message: '登录失败，请检查用户名和密码' })
                }
                res.json({ ok: true, memberInfo: result.memberInfo })
            } catch (e) {
                config.setValue('username', '')
                config.setValue('password', '')
                res.json({ ok: false, message: String(e.message || e) })
            }
        })
    }

    function handleLogout(app, api) {
        app.post(`${api}/logout`, async (_req, res) => {
            try {
                config.setValue('username', '')
                config.setValue('password', '')
                config.setValue('token', '')
                config.setValue('cookie', '')
                config.setValue('memberInfo', null)
                res.json({ ok: true })
            } catch (e) {
                res.json({ ok: false, message: String(e.message || e) })
            }
        })
    }

    function handleCategoryInfo(app, api) {
        app.get(`${api}/category/info`, async (req, res) => {
            try {
                const info = await crawler.rank.categories();
                res.json({ok: true, categories: info?.categories || [], blocks: info?.blocks || []});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleCategoryFilter(app, api) {
        app.get(`${api}/category/filter`, async (req, res) => {
            try {
                const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
                const time = String(req.query.time || 'a').slice(0, 1) || 'a';
                const slug = String(req.query.slug || '');
                const sort = String(req.query.sort || 'mv');
                const sub = String(req.query.sub || '');
                const result = await crawler.rank.categoriesFilter(page, time, slug, sort, sub);
                const comicDir = path.join(config.dataDir, 'comic');
                const list = (result?.content || []).map((item) => {
                    const id = Number(item.id);
                    const o = {
                        ...item,
                        id,
                        name: String(item.name || ''),
                        cover: String(item.image || ''),
                        author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                        tags: Array.isArray(item.tags) ? item.tags.map(String) : [],
                        total_views: String(item.total_views ?? ''),
                        likes: String(item.likes ?? ''),
                        inStore: false,
                        canRead: false,
                    };
                    return rewriteComicMediaUrls(o);
                });
                await Promise.all(list.map(async (o) => {
                    const dbRow = await store.comicMeta.get(o.id);
                    o.inStore = !!dbRow;
                    o.canRead = isNotEmptySync(path.join(comicDir, `${o.id}.zip`));
                }));
                res.json({ok: true, list, total: result?.total || list.length, pages: result?.pages || 1});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleDownload(app, api) {
        app.post(`${api}/comics/:num/download`, async (req, res) => {
            try {
                const album = Math.floor(Number(req.params.num));
                const episodeNumber = Math.floor(Number(req.body.episodeNumber));
                const n = Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : album;
                const coverUrl = String(req.body.coverUrl || '');
                const name = String(req.body.title || req.body.name || '');
                const episodeName = String(req.body.episodeTitle || req.body.episodeName || '');
                const downloadLabel = String(req.body.downloadLabel || '').slice(0, 240);
                const tagsBody = req.body.tags;
                const comicTags = Array.isArray(tagsBody) ? tagsBody.filter(Boolean).map(String) : [];
                const withMeta = req.body.withMeta !== false;

                // 构建展示标题
                let displayTitle;
                if (n !== album && episodeName) {
                    displayTitle = `JM${n}: ${name || `#${album}`} - ${episodeName}`;
                } else {
                    displayTitle = `JM${album}: ${name || `#${album}`}`;
                }

                // 封面转 base64
                let coverBase64 = '';
                if (coverUrl) {
                    try {
                        const resp = await fetch(coverUrl, {signal: AbortSignal.timeout(5000)});
                        if (resp.ok) {
                            const buf = Buffer.from(await resp.arrayBuffer());
                            const mime = resp.headers.get('content-type') || 'image/jpeg';
                            coverBase64 = `data:${mime};base64,${buf.toString('base64')}`;
                        }
                    } catch (_) {
                    }
                }

                if (taskManager) {
                    const taskLabels = name ? [name, ...comicTags] : [album.toString(), downloadLabel].filter(Boolean);
                    const result = await taskManager.addTask(n, taskLabels, {
                        coverBase64,
                        displayTitle,
                        episodeNumber: n,
                        withMeta,
                    });
                    if (!result.ok) {
                        res.json(result);
                        return;
                    }
                }
                res.json({ok: true});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleBatchAdd(app, api) {
        app.post(`${api}/comics/:num/batch-add`, async (req, res) => {
            try {
                const num = Math.floor(Number(req.params.num));
                if (!Number.isFinite(num)) {
                    res.json({ok: false, message: '无效 JM 编码'});
                    return;
                }
                const withMeta = req.body.withMeta !== false;

                if (!taskManager) {
                    res.json({ok: false, message: '任务管理器不可用'});
                    return;
                }

                const result = await taskManager.addTask(num, [], {
                    episodeNumber: num,
                    withMeta,
                });
                res.json(result);
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleZipFile(app, api) {
        app.get(`${api}/comics/:albumNum/zip-file/:zipKey`, (req, res) => {
            const n = Math.floor(Number(req.params.zipKey));
            const zipPath = path.join(config.dataDir, 'comic', `${n}.zip`);
            if (!isNotEmptySync(zipPath)) {
                res.status(404).json({ok: false, message: 'ZIP 不存在'});
                return;
            }
            res.setHeader('Content-Type', 'application/zip');
            fs.createReadStream(zipPath).pipe(res);
        });
    }

    function handleBrowse(app, api) {
        const exec = require('node:child_process').exec;
        app.post(`${api}/browse-dir`, (_req, res) => {
            if (process.platform !== 'win32') { res.json({ok: false, message: '仅 Windows 支持'}); return; }
            const script = 'Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; $f.ShowDialog() | Out-Null; Write-Output $f.SelectedPath';
            exec(`powershell -NoProfile -Command "${script}"`, {windowsHide: true, timeout: 30000}, (err, stdout) => {
                const p = (stdout || '').trim();
                if (p) res.json({ok: true, path: p});
                else res.json({ok: false, message: '未选择目录'});
            });
        });
        app.post(`${api}/browse-file`, (_req, res) => {
            if (process.platform !== 'win32') { res.json({ok: false, message: '仅 Windows 支持'}); return; }
            const script = 'Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; $f.ShowDialog() | Out-Null; Write-Output $f.FileName';
            exec(`powershell -NoProfile -Command "${script}"`, {windowsHide: true, timeout: 30000}, (err, stdout) => {
                const p = (stdout || '').trim();
                if (p) res.json({ok: true, path: p});
                else res.json({ok: false, message: '未选择文件'});
            });
        });
    }

    function handleReads(app, api) {
        app.post(`${api}/comics/:num/read`, async (req, res) => {
            try {
                const comicId = Math.floor(Number(req.params.num));
                const episodeId = req.body.episodeId != null ? Math.floor(Number(req.body.episodeId)) : comicId;
                if (!Number.isFinite(episodeId)) {
                    res.json({ok: false, message: '无效的 episodeId'});
                    return;
                }
                await store.comicRead.saveRead(episodeId);
                res.json({ok: true});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.post(`${api}/reads/check`, async (req, res) => {
            try {
                const ids = req.body.ids;
                if (!Array.isArray(ids)) {
                    res.json({ok: false, message: 'ids 必须是数组'});
                    return;
                }
                const readIds = await store.comicRead.checkReads(ids.map(id => Math.floor(Number(id))).filter(Number.isFinite));
                res.json({ok: true, readIds});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleBans(app, api) {
        app.post(`${api}/comics/:num/ban`, async (req, res) => {
            try {
                const num = Math.floor(Number(req.params.num));
                if (!Number.isFinite(num) || num < 1) {
                    res.status(400).json({ok: false, message: '无效编码'});
                    return;
                }
                const banned = await store.comicBan.toggleBan(num);
                res.json({ok: true, banned});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.post(`${api}/bans/check`, async (req, res) => {
            try {
                const ids = req.body.ids;
                if (!Array.isArray(ids)) {
                    res.json({ok: false, message: 'ids 必须是数组'});
                    return;
                }
                const bannedIds = await store.comicBan.checkBans(ids.map((id) => Math.floor(Number(id))).filter(Number.isFinite));
                res.json({ok: true, bannedIds});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.get(`${api}/bans`, async (_req, res) => {
            try {
                const ids = await store.comicBan.listBans();
                res.json({ok: true, ids});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.post(`${api}/comics/:num/star`, async (req, res) => {
            try {
                const num = Math.floor(Number(req.params.num));
                if (!Number.isFinite(num) || num < 1) {
                    res.status(400).json({ok: false, message: '无效编码'});
                    return;
                }
                const starred = await store.comicStar.toggleStar(num);
                res.json({ok: true, starred});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.post(`${api}/stars/check`, async (req, res) => {
            try {
                const ids = req.body.ids;
                if (!Array.isArray(ids)) {
                    res.json({ok: false, message: 'ids 必须是数组'});
                    return;
                }
                const starredIds = await store.comicStar.checkStars(ids.map((id) => Math.floor(Number(id))).filter(Number.isFinite));
                res.json({ok: true, starredIds});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.get(`${api}/stars`, async (_req, res) => {
            try {
                const ids = await store.comicStar.listStars();
                res.json({ok: true, ids});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleOpenViewer(app, api) {
        app.post(`${api}/comics/:num/open-viewer`, async (req, res) => {
            try {
                const album = Math.floor(Number(req.params.num));
                const episodeNumber = Math.floor(Number(req.body.episodeNumber));
                const n = Number.isFinite(episodeNumber) && episodeNumber > 0 ? episodeNumber : album;
                const zipPath = path.join(path.resolve(manifest.workspace, config.dataDir), 'comic', `${n}.zip`);
                const exeRel = String(config.comicViewer || '').trim();
                if (!exeRel) {
                    res.json({ok: true, useBrowser: true});
                    return;
                }
                if (!isNotEmptySync(zipPath)) {
                    res.json({ok: false, message: 'ZIP 不存在'});
                    return;
                }
                const workspaceRoot = String(manifest.workspace || path.join(__dirname, '..'));
                const exeAbs = path.isAbsolute(exeRel) ? exeRel : path.join(workspaceRoot, exeRel);
                const cmdTpl = "${exe} ${path}";
                if (cmdTpl) {
                    const q = (p) => {
                        const s = String(p);
                        if (process.platform === 'win32') {
                            if (!/[ \t"&[\]{}|^`%]/.test(s)) return s;
                            return `"${s.replace(/"/g, '""')}"`;
                        }
                        return `'${s.replace(/'/g, `'\\''`)}'`;
                    };
                    const cmdLine = cmdTpl.replace(/\$\{path\}/gi, q(zipPath)).replace(/\$\{exe\}/gi, q(exeAbs));
                    const child = exec(cmdLine, {windowsHide: true, detached: true}, () => {
                    });
                    if (child && typeof child.unref === 'function') child.unref();
                    res.json({ok: true, useBrowser: false});
                    return;
                }
                const args = [];
                spawn(exeAbs, args, {detached: true, stdio: 'ignore'}).unref();
                res.json({ok: true, useBrowser: false});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handleForum(app, api) {
        app.get(`${api}/forum/list`, async (req, res) => {
            try {
                const mode = String(req.query.mode || 'all');
                const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
                const data = await crawler.forum.feed(mode, page);
                res.json({ok: true, ...data});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.get(`${api}/forum`, async (req, res) => {
            try {
                const aid = String(req.query.aid || '');
                let uid = String(req.query.uid || '');
                const page = Math.max(1, parseInt(String(req.query.page || '1'), 10) || 1);
                let data;
                if (aid) {
                    data = await crawler.forum.list(aid, page);
                } else if (uid || req.query.my === '1') {
                    if (!uid) uid = String(config.memberInfo?.uid || '');
                    if (!uid) { res.json({ok: false, message: '未登录'}); return }
                    data = await crawler.forum.byUser(uid, page);
                } else {
                    res.json({ok: false, message: 'aid 或 uid 参数必填'});
                    return;
                }
                res.json({ok: true, ...data});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
        app.post(`${api}/comment`, async (req, res) => {
            try {
                const comment = String(req.body.comment || '').trim();
                const aid = String(req.body.aid || '');
                const comment_id = req.body.comment_id ? String(req.body.comment_id).trim() : '';
                if (!comment) { res.json({ok: false, message: '评论内容不能为空'}); return }
                const data = await crawler.forum.post(comment, aid, comment_id);
                res.json({ok: data.status === 'ok', ...data});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    function handlePromote(app, api) {
        app.get(`${api}/promote`, async (req, res) => {
            try {
                const list = await crawler.promote.list();
                const sections = (list || []).map((s) => ({
                    id: String(s.id || ''),
                    title: String(s.title || ''),
                    slug: String(s.slug || ''),
                    type: String(s.type || ''),
                    filter_val: String(s.filter_val || ''),
                    content: (s.content || []).map((item) => {
                        const id = Number(item.id || item.aid);
                        const o = {
                            id,
                            name: String(item.name || item.title || ''),
                            author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                            cover: String(item.image || ''),
                            category: item.category || null,
                            category_sub: item.category_sub || null,
                            liked: !!item.liked,
                            is_favorite: !!item.is_favorite,
                            update_at: item.update_at || 0,
                        };
                        return rewriteComicMediaUrls(o);
                    }),
                }));
                res.json({ok: true, list: sections});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });

        app.get(`${api}/promote/sections`, async (req, res) => {
            try {
                const list = await crawler.promote.sections();
                res.json({ok: true, list});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });

        app.get(`${api}/promote/list`, async (req, res) => {
            try {
                const id = parseInt(req.query.id, 10);
                const page = parseInt(req.query.page, 10);
                if (!Number.isFinite(id)) {
                    return res.status(400).json({ok: false, message: 'missing id'});
                }
                const result = await crawler.promote.promoteList(id, Number.isFinite(page) ? page : 0);
                const comicDir = path.join(config.dataDir, 'comic');
                const list = (result?.list || []).map((item) => {
                    const id = Number(item.aid || item.id);
                    const o = {
                        ...item,
                        id,
                        name: String(item.title || item.name || ''),
                        cover: String(item.cover || item.image || ''),
                        author: Array.isArray(item.author) ? item.author : (item.author ? [String(item.author)] : []),
                        inStore: false,
                        canRead: false,
                    };
                    return rewriteComicMediaUrls(o);
                });
                await Promise.all(list.map(async (o) => {
                    const dbRow = await store.comicMeta.get(o.id);
                    o.inStore = !!dbRow;
                    o.canRead = isNotEmptySync(path.join(comicDir, `${o.id}.zip`));
                }));
                res.json({ok: true, list, total: result?.total || 0});
            } catch (e) {
                console.error('[server]', e);
                res.status(500).json({ok: false, message: String(e.message || e)});
            }
        });
    }

    async function start() {
        const app = express();
        expressWs(app);
        const morgan = require('morgan');
        morgan.token('time', () => new Date().toISOString())
        morgan.token('body', (req) => JSON.stringify(req.body))
        morgan.token('pid', () => process.pid)
        app.use(
            morgan(
                ':time [:pid] :method :url :status :res[content-length] - :response-time ms'
            )
        );
        app.use(compression());
        app.use(express.json({limit: '2mb'}));
        const api = '/api';
        handleStatic(app);
        handleStaticFile(app);
        handleProgressWs(app, api);
        handleJmConfig(app, api);
        handleSettings(app, api);
        handleSync(app, api);
        handleTags(app, api);
        handleComicsList(app, api);
        handleFetchMeta(app, api);
        handleComicDetail(app, api);
        handleComicSearch(app, api);
        handleWeekInfo(app, api);
        handleWeekComics(app, api);
        handleSerialComics(app, api);
        handleLatestComics(app, api);
        handleCategoryInfo(app, api);
        handleCategoryFilter(app, api);
        handleFavorites(app, api);
        handleAccountSign(app, api);
        handleLogin(app, api);
        handleLogout(app, api);
        handleDownload(app, api);
        handleBatchAdd(app, api);
        handleZipFile(app, api);
        handleBans(app, api);
        handleReads(app, api);
        handleOpenViewer(app, api);
        handleBrowse(app, api);
        handleForum(app, api);
        handlePromote(app, api);
        await new Promise((resolve, reject) => {
            _server = app.listen(port, host, () => {
                if (typeof ctx?.log === 'function') {
                    ctx.log({
                        text: `[jm.server] ${homeUrl} listen=${host}:${port} static=${staticMounted ? 'ok' : 'missing'}`,
                    });
                }
                console.log(`[jm.server] ${homeUrl} listen=${host}:${port} static=${staticMounted ? 'ok' : 'missing'}`);
                resolve({port, homeUrl, host});
            });
            _server.on('error', reject);
        });
        return {port, homeUrl: homeUrl, host};
    }

    async function stop() {
        if (_server) {
            _server.close();
            _server = null;
        }
        progressClients.clear();
    }

    return {
        start,
        stop,
        sendMessage,
        toFileUrl,
        homeUrl
    };
}

module.exports = {
    createServer,
};
