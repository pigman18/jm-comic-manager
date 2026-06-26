'use strict'

const fs = require('node:fs');
const path = require('node:path');
const {pipeline: streamPipeline} = require('stream');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const JSZip = require('jszip');
const AsyncLock = require('async-lock');
const lock = new AsyncLock();

const {ApiPath, SearchSort, PHASE, STATE, STEP, ERR} = require('./protocol');
const {retryAndCatch} = require('../util/common');
const {url2DataPath, downloadResume, getResponseStream, getAxiosResponseText, withRetry, toQueryString, fetchAllPageData} = require('../util/http');
const {touchFileSync, writeToFileSync, isNotEmptySync, renameSync} = require('../util/file');
const {parseComicRankingPage, parseSerializationList, parseWeekList, parseComicWeekList, parseMeta, parseNumber} = require('./parser');
const FormData = require('form-data');
const {JmMagicConstants, decideHeadersAndTs, decodeDomainServerData, decodeRespData} = require('./mobile');

const UserAgents = require('../build/userAgents.json');

// ================= JM 客户端 =================
/**
 * JM 模块爬虫
 * @param manifest      JM 模块应用配置
 * @param ctx           上下文对象
 * @param message     JM 模块消息分发器
 * @param config      JM 模块用户配置
 * @return {object}
 */
function createCrawler(manifest, ctx, message, config) {
    // 1、userAgent
    const keys = Object.keys(UserAgents);
    const userAgent = UserAgents[keys[Math.floor(Math.random() * keys.length)]];
    // 3、获取爬虫相关域名
    let {
        host,
        cdnHosts,
        apiHosts,
        dataDir
    } = config;
    // 2、设置 info目录、album_missing目录、episodes目录
    let infoDir = path.join(dataDir, 'info'),                    // 存放漫画基本信息
        comicDir = path.join(dataDir, 'comic'),                  // 存放漫画内容
        fileDir = path.join(dataDir, 'file');                    // 存放其他数据
    // 3、创建http请求客户端
    let apiClient = createApiClient();
    let httpClient = createHttpClient();

    /**
     * 创建 http 请求客户端
     */
    function createApiClient() {
        // 1、创建 http 请求客户端
        let agent = null;
        let proxy = config.proxy || '';
        if (proxy.startsWith('socks5://')) {
            agent = new SocksProxyAgent(proxy);
        } else if (proxy.startsWith('http://')) {
            agent = new HttpsProxyAgent(proxy);
        }
        let apiClient = axios.create({
            httpAgent: agent,
            httpsAgent: agent,
            proxy: false      // 关键：禁用 axios 自带的代理检测
        });
        // 2、设置请求拦截
        apiClient.interceptors.request.use((cfg) => {
            cfg.adapter = 'http'; // ✅ 明确只走 Node
            // 3、实时获取配置中的 userAgent、cookie
            cfg.timeout = config.timeout || 5000;
            cfg.headers['user-agent'] = userAgent;
            cfg.headers['cookie'] = config.cookie;
            cfg.headers['accept'] = 'text/html,application/json,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
            //  4、统一加签、解码
            const { ts, headers } = decideHeadersAndTs(cfg.url);
            cfg.headers = {
                ...cfg.headers,
                ...headers
            };
            if (!!config?.token && config?.memberInfo?.uid) {
                cfg.headers['Authorization'] = 'Bearer ' + config.token;
            }
            cfg.__jm_ts = ts;
            return cfg;
        });
        apiClient.interceptors.response.use((resp) => {
            const ts = resp.config.__jm_ts;
            if (!!resp.config?.withIgnoredDecode) return resp;
            try {
                if (JmMagicConstants.API_DOMAIN_SERVER_SECRET === resp.config.decodeSecret) {
                    let raw = resp?.data || '';
                    // 1、解码域名
                    if (!!raw && !((Array.isArray(raw) && raw.length === 0))) {
                        resp.data = decodeDomainServerData(raw, ts);
                    }
                } else {
                    let raw = resp?.data?.data || '';
                    // 2、解码普通请求
                    if (!!raw && !((Array.isArray(raw) && raw.length === 0))) {
                        resp.data.data = decodeRespData(raw, ts);
                    }
                }
            } catch (e) {
                console.warn('JM decode failed', e);
            }
            return resp;
        });
        return apiClient;
    }

    /**
     * 创建 http 请求客户端
     */
    function createHttpClient() {
        // 1、创建 http 请求客户端
        let agent = null;
        let proxy = config.proxy || '';
        if (proxy.startsWith('socks5://')) {
            agent = new SocksProxyAgent(proxy);
        } else if (proxy.startsWith('http://')) {
            agent = new HttpsProxyAgent(proxy);
        }
        let httpClient = axios.create({
            httpAgent: agent,
            httpsAgent: agent,
            proxy: false      // 关键：禁用 axios 自带的代理检测
        });
        // 2、设置请求拦截
        httpClient.interceptors.request.use((cfg) => {
            cfg.adapter = 'http'; // ✅ 明确只走 Node
            // 3、实时获取配置中的 userAgent、cookie
            cfg.timeout = config.timeout || 5000;
            cfg.headers['user-agent'] = userAgent;
            cfg.headers['cookie'] = config.cookie;
            cfg.headers['accept'] = 'text/html,application/json,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
            return cfg;
        });
        return httpClient;
    }

    /**
     * 拉取最新api域名
     * @return {Promise<unknown[]>}
     */
    async function fetchLatestApiHosts() {
        let resp = await apiClient.get(`https://rup4a04-c02.tos-cn-hongkong.bytepluses.com/newsvr-2025.txt`, {
            decodeSecret: JmMagicConstants.API_DOMAIN_SERVER_SECRET
        });
        let apiHosts = (resp?.data?.Setting || []).map((host) => {
            if (!host.startsWith('http')) {
                return `https://${host}`;
            }
            return host;
        });
        config.setValue('apiHosts', apiHosts);
        return apiHosts;
    }

    /**
     * 获取apiHost
     * @return {*}
     */
    function getApiHost() {
        return apiHosts[Math.floor(Math.random() * apiHosts.length)];
    }

    /**
     * 进行 JM 网页登录（有锁）
     * 1、通过 cloudflare 校验，获取 cf_clearance、ipcountry、ipm5、theme=light、AVS、sticky 这些 cookie 头
     * 2、GET 访问/albums/meiman 页面，会返回 set-cookie，ipcountry、ipm5
     * 3、POST 请求/login 接口，继续追加 cookie
     * 4、再次跳转会/albums/meiman 页面
     * @return {Promise<{cookie, userAgent, username}|*>}
     */
    async function login(phase = PHASE.LOGIN, phaseData = {}) {
        phase = phase || PHASE.LOGIN;
        phaseData = phaseData || {};
        // 1、定义使用到的页面、api
        return await message.doLockPhase(phase, async (stepHandler) => {
            // 2、定义步骤过程
            let steps = {
                // 2.1、检查当前用户名密码是否有填写
                [STEP.CHECK_LOGIN_PARAMS]: async () => {
                    return await stepHandler.doStep(STEP.CHECK_LOGIN_PARAMS, async () => {
                        return new Promise((resolve, reject) => {
                            // 1、定时验证用户名密码是否有填写，否则则不会进入登录流程
                            const check = () => {
                                if (config.username && config.password) {
                                    resolve();
                                } else {
                                    // 通知前端
                                    message?.onMessage({
                                        phase: PHASE.LOGIN,
                                        stepL: STEP.CHECK_LOGIN_PARAMS,
                                        state: STATE.ERROR,
                                        error: ERR.LOGIN_NO_CREDENTIAL

                                    });
                                    setTimeout(check, 1000);
                                }
                            };
                            check();
                        });
                    });
                },
                // 2.2、请求登录接口
                [STEP.LOGIN_API]: async () => {
                    // 模拟点击了主站的弹窗
                    return await stepHandler.doStep(STEP.LOGIN_API, async () => {
                        // 1、请求登录接口
                        let formData = new URLSearchParams();
                        formData.append("username", config.username);
                        formData.append("password", config.password);
                        // 记住密码 +180 天
                        let resp = await apiClient.post(`${getApiHost()}/login`, formData.toString(), {
                            headers: {
                                'Content-Type': 'application/x-www-form-urlencoded'
                            }
                        });
                        if (200 !== resp.status || 200 !== resp.data.code) {
                            throw ERR.LOGIN_API_FAILED;
                        }
                        let memberInfo = resp.data.data;
                        // 2、记录用户信息、token
                        if (memberInfo?.jwttoken) {
                            config.setValue('token', memberInfo.jwttoken);
                        }
                        config.setValue('memberInfo', memberInfo);
                        return {
                            cookie: config.cookie
                        };
                    });
                },
            };
            // 3、执行步骤过程
            await steps[STEP.CHECK_LOGIN_PARAMS]();
            await steps[STEP.LOGIN_API]();
            return {
                username: config.username,
                userAgent: config.userAgent,
                cookie: config.cookie,
                token: config.token,
                memberInfo: config.memberInfo,
                ...phaseData
            };
        }, phaseData);
    }

    /**
     * 重试
     * @param func
     * @return {Promise<object>}
     */
    async function expireRetry(func, signal = null) {
        return retryAndCatch(func, async (err) => {
            if (signal?.aborted || err.__isAbort || err.name === 'AbortError' || err.name === 'CanceledError' || err.code === 'ERR_CANCELED') {
                return true;
            }
            if (403 === err.status) {
                // 出现403错误，需要重新登录
                await login(err.phase, err.phaseData);
            }
            if (404 === err.status) {
                // 无效资源，直接退出重试
                return true;
            }
            // 继续重试
            return false;
        });
    }

    /**
     * 签到
     * @return {Promise<object>}
     */
    async function sign() {
        // 1、先登录
        if (!config.token || !config?.memberInfo?.uid) {
            await login();
        }
        return await expireRetry(async () => {
            let formData = new URLSearchParams();
            formData.append("user_id", config?.memberInfo?.uid);
            formData.append("daily_id", "1");
            // 记住密码 +180 天
            let resp = await apiClient.post(`${getApiHost()}/daily_chk`, formData.toString(), {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': 'Bearer ' + config.token
                }
            });
            return {
                msg: resp.data.data.msg
            };
        });
    }

    /**
     * 拉取漫画
     * 原理：以 https://18comic.vip/album_download/645130 为例
     * 1、页面一进来，实际就直接请求了 https://18comic.vip/captcha/ 验证码接口
     * 2、点击倒计时，其实就是把请求的验证码显示出来而已，如果自己单独请求了验证码接口，把获取到的内容填入后也是可以用的
     * 3、接下来请求接口
     * [POST]https://18comic.vip/album_download/645130
     * params:
     *  album_id: 645130
     *  verification: 验证码结果
     * headers:
     *  content-type: application/x-www-form-urlencoded
     * 会进行 301 转发，拿到 Location 就是下载文件地址
     * @param number
     * @param filePath
     * @param phase
     * @param afterSteps
     * @return {Promise<null|*>}
     */
    async function downloadAlbumArchive(number, filePath, phase = PHASE.FETCH_COMIC, afterSteps = null, signal = null) {
        number = Number(number);
        // 1、执行下载流程
        return await message.doPhase(phase || PHASE.FETCH_COMIC, async (stepHandler, phaseMessageData) => {
            // 2、定义步骤过程
            let steps = {
                // 3、请求漫画真实下载链接
                [STEP.REAL_LINK]: async () => {
                    return await stepHandler.doStep(STEP.REAL_LINK, async (stepMessageData, onProgress) => {
                        let resp = await apiClient.get(`${getApiHost()}/album_download_2/${number}`, {
                            headers: {
                                'Authorization': 'Bearer ' + config.token
                            },
                            signal,
                        });
                        if ('0' === resp?.data?.data?.status) {
                            let error = new Error(resp?.data?.data?.msg || '');
                            error.status = 403;
                            // 直接结束
                            if ('尚未兑换' === error.message) {
                                error.status = 404;
                            } else if ('无效A漫连结或下载已关闭，谢谢。 !' === error.message) {
                                error.status = 404;
                            }
                            throw error;
                        }
                        let realUrl = resp.data.data.download_url;
                        return {
                            url: realUrl
                        }
                    }, {number});
                },
                // 4、下载漫画
                [STEP.DOWNLOAD]: async (realUrl) => {
                    return await stepHandler.doStep(STEP.DOWNLOAD, async (stepMessageData, onStepProgress) => {
                        let finalComplete = 0, finalTotal = 0;
                        await downloadResume(realUrl, filePath, {
                            proxy: config.proxy,
                            signal,
                            onProgress: ({complete, total}) => {
                                onStepProgress(complete, total);
                                finalComplete = complete;
                                finalTotal = total;
                            }
                        });
                        if (afterSteps) {
                            await afterSteps({ number, complete: finalComplete, total: finalTotal });
                        }
                        return {
                            complete: finalComplete,
                            total: finalTotal
                        }
                    }, {number});
                }
            };
            try {
                // 同时间只能请求1个真实链接
                let url = await lock.acquire('captcha-real-link', async () => {
                    let {url} = await steps[STEP.REAL_LINK]();
                    return url;
                });
                let {complete, total} = await expireRetry(async () => {
                    return await steps[STEP.DOWNLOAD](url);
                }, signal);
                return {
                    number,
                    complete,
                    total
                }
            } catch (e) {
                e.phase = PHASE.FETCH_COMIC;
                e.phaseData = {
                    number
                };
                throw e;
            }
        });
    }

    /**
     * 远程下载文件到本地
     * @param {string} url
     * @param {boolean} [force] 为 true 时强制重新下载
     * @returns {Promise<string>}
     */
    async function fetchRemoteFile(url, force = false) {
        // 1、校验链接
        url = (url || '').trim();
        if (!url) {
            return null;
        }
        let dataPath = url2DataPath(url, fileDir, false);
        if (isNotEmptySync(dataPath)) {
            return dataPath;
        }
        let {
            file
        } =  await message.doPhase(PHASE.FETCH_FILE, async (stepHandler, phaseMessageData) => {
            // 1、进行文件下载
            return await expireRetry(async () => {
                const response = await httpClient.get(url, {
                    responseType: 'stream',
                });
                await downloadResume(url, dataPath, {
                    proxy: config.proxy
                });
                return {
                    file: dataPath
                }
            });
        });
        return file;
    }

    /**
     * 往zip注入漫画内容文件
     * @param zipPath
     * @param xml
     * @return {Promise<void>}
     */
    async function injectComicInfo(zipPath, xml) {
        const buf = fs.readFileSync(zipPath);
        let zip;
        try {
            zip = await JSZip.loadAsync(buf);
        } catch (e) {
            console.error(`[injectComicInfo] JSZip.loadAsync 失败: ${e.message}`);
            throw e;
        }

        zip.file('ComicInfo.xml', xml, {
            compression: 'DEFLATE'
        });
        let out;
        try {
            out = await zip.generateAsync({
                type: 'nodebuffer',
                compression: 'DEFLATE',
                platform: 'DOS'
            });
        } catch (e) {
            console.error(`[injectComicInfo] zip.generateAsync 失败: ${e.message}`);
            throw e;
        }
        try {
            fs.writeFileSync(zipPath, out);
        } catch (e) {
            console.error(`[injectComicInfo] 写入文件失败 (文件被占用): ${e.message}`);
            throw e;
        }
    }

    async function init() {
        await login();
    }

    async function close() {

    }

    let account = {
        login: login,
        sign: sign,
        getFavorites: async (page = 1, folderId = '') => {
            if (!config.token || !config?.memberInfo?.uid) {
                await login();
            }
            return await expireRetry(async () => {
                const params = { page };
                if (folderId) params.folder_id = folderId;
                let resp = await apiClient.get(`${getApiHost()}/favorite`, {
                    params,
                    headers: {
                        'Authorization': 'Bearer ' + config.token
                    }
                });
                if (200 !== resp.data.code) {
                    throw new Error(resp.data.msg || '获取收藏失败');
                }
                return resp.data.data;
            });
        },
        addFavorite: async (albumId) => {
            if (!config.token || !config?.memberInfo?.uid) {
                await login();
            }
            return await expireRetry(async () => {
                let formData = new URLSearchParams();
                formData.append('aid', String(albumId));
                formData.append('type', 'add');
                let resp = await apiClient.post(`${getApiHost()}/favorite`, formData.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Bearer ' + config.token
                    }
                });
                if (resp.data.data?.status !== 'ok') {
                    throw new Error(resp.data.data?.msg || '添加收藏失败');
                }
                return resp.data.data;
            });
        },
        removeFavorite: async (albumId) => {
            if (!config.token || !config?.memberInfo?.uid) {
                await login();
            }
            return await expireRetry(async () => {
                let formData = new URLSearchParams();
                formData.append('aid', String(albumId));
                formData.append('type', 'del');
                let resp = await apiClient.post(`${getApiHost()}/favorite`, formData.toString(), {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Authorization': 'Bearer ' + config.token
                    }
                });
                if (resp.data.data?.status !== 'ok') {
                    throw new Error(resp.data.data?.msg || '取消收藏失败');
                }
                return resp.data.data;
            });
        },
        createFolder: async (name) => {
            if (!config.token || !config?.memberInfo?.uid) await login();
            return await expireRetry(async () => {
                let fd = new URLSearchParams();
                fd.append('type', 'add');
                fd.append('folder_name', name);
                let resp = await apiClient.post(`${getApiHost()}/favorite_folder`, fd.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Bearer ' + config.token }
                });
                if (resp.data.data?.status !== 'ok') throw new Error(resp.data.data?.msg || '创建收藏夹失败');
                return resp.data.data;
            });
        },
        renameFolder: async (folderId, name) => {
            if (!config.token || !config?.memberInfo?.uid) await login();
            return await expireRetry(async () => {
                let fd = new URLSearchParams();
                fd.append('type', 'edit');
                fd.append('folder_id', folderId);
                fd.append('folder_name', name);
                let resp = await apiClient.post(`${getApiHost()}/favorite_folder`, fd.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Bearer ' + config.token }
                });
                if (resp.data.data?.status !== 'ok') throw new Error(resp.data.data?.msg || '重命名收藏夹失败');
                return resp.data.data;
            });
        },
        deleteFolder: async (folderId) => {
            if (!config.token || !config?.memberInfo?.uid) await login();
            return await expireRetry(async () => {
                let fd = new URLSearchParams();
                fd.append('type', 'del');
                fd.append('folder_id', folderId);
                let resp = await apiClient.post(`${getApiHost()}/favorite_folder`, fd.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Bearer ' + config.token }
                });
                if (resp.data.data?.status !== 'ok') throw new Error(resp.data.data?.msg || '删除收藏夹失败');
                return resp.data.data;
            });
        },
        moveToFolder: async (albumId, sourceFolderId, targetFolderId) => {
            if (!config.token || !config?.memberInfo?.uid) await login();
            return await expireRetry(async () => {
                let fd = new URLSearchParams();
                fd.append('type', 'move');
                fd.append('folder_id', targetFolderId);
                fd.append('aid', String(albumId));
                fd.append('o', sourceFolderId);
                let resp = await apiClient.post(`${getApiHost()}/favorite_folder`, fd.toString(), {
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Authorization': 'Bearer ' + config.token }
                });
                if (resp.data.data?.status !== 'ok') throw new Error(resp.data.data?.msg || '移动收藏失败');
                return resp.data.data;
            });
        }
    };

    let comic = {
        // 获取漫画元信息
        getMeta: async (number, phase) => {
            number = parseNumber(number);
            phase = phase || PHASE.GET_META;
            let {
                meta
            } = await message.doPhase(phase, async (stepHandler) => {
                let resp = await expireRetry(async () => {
                    return await apiClient.get(`${getApiHost()}/album?id=${number}`);
                });
                let meta = resp.data.data;
                if (!meta?.id) {
                    throw ERR.INFO_NOT_FOUND;
                }
                return {
                    number,
                    meta: meta
                };
            }, {number});
            return meta;
        },
        // 下载漫画压缩包
        downloadArchive: async (number, withAppendComicInfo = true, afterSteps = null, signal = null) => {
            number = parseNumber(number);
            let archiveFile = `${comicDir}/${number}.zip`;
            if (isNotEmptySync(archiveFile)) {
                let st = fs.statSync(archiveFile);
                return {
                    file: archiveFile,
                    complete: st.size,
                    total: st.size,
                };
            }
            let {
                complete,
                total
            } = await expireRetry(() => downloadAlbumArchive(number, archiveFile, PHASE.FETCH_COMIC, null, signal), signal);
            if (!!total) {
                if (afterSteps) {
                    await afterSteps({ number, file: archiveFile, complete, total });
                }
                return {
                    file: archiveFile,
                    complete: complete,
                    total: total,
                };
            }
            throw ERR.COMIC_NOT_FOUND;
        },

        /**
         * 追加漫画信息到压缩包
         * @param info               漫画元信息（含 episodes）
         * @param file               漫画文件
         * @return {Promise<void>}
         */
        appendComicInfo2Archive: async (info, file) => {
            if (!isNotEmptySync(file)) {
                console.error(`[appendComicInfo2Archive] 文件为空: ${file}`);
                return;
            }
            let {
                id,
                series,
                name: title,
                description,
                author: authors,
                tags
            } = info;
            let comicInfo = {
                title: '',
                number: 1,
                series: '',
                summary: '',
                writer: '',
                penciller: '',
                publisher: '',
                genre: '',
                tags: '',
                web: '',
                languageIso: 'zh'
            };
            // 1、填充漫画介绍文件
            comicInfo.series = `${title}`;
            comicInfo.summary = description;
            comicInfo.writer = (authors || []).join(',');
            comicInfo.penciller = (authors || []).join(',');
            comicInfo.publisher = (authors || [])[0] || '';
            comicInfo.genre = (tags || []).join(',');
            comicInfo.tags = (tags || []).join(',');
            const albumNumber = info.id || id;
            // 从文件名中提取实际编号（子集下载时 file 是子集编号）
            const fileNumber = Number(path.basename(file, '.zip'));
            comicInfo.web = `${host}/album/${albumNumber}/`;
            // 2、子标题的特殊处理
            if (fileNumber !== albumNumber && !!series && series.length > 0) {
                let ep = series.filter((obj) => Number(obj.id) === fileNumber)[0];
                if (!ep) {
                    console.error(`匹配信息失败，麻烦自行查找：${fileNumber}`);
                    return;
                }
                comicInfo.title = `${title}：${ep.name}`;
                comicInfo.number = series.indexOf(ep) + 1;
            } else {
                comicInfo.title = `${title}`;
                comicInfo.number = 1;
            }
            // 4、拼接xml内容
            let comicInfoXml = `<?xml version="1.0" encoding="UTF-8"?>
<ComicInfo>
  <Title>${comicInfo.title}</Title>
  <Series>${comicInfo.series}</Series>
  <Number>${comicInfo.number}</Number>
  <Summary>${comicInfo.summary}</Summary>

  <!-- ===== 创作与出版人员（字符串类型，多人可用英文逗号分隔） ===== -->
  <Writer>${comicInfo.writer}</Writer>
  <Penciller>${comicInfo.penciller}</Penciller>
  <Publisher>${comicInfo.publisher}</Publisher>

  <!-- ===== 分类与标签（字符串类型，多值用英文逗号分隔） ===== -->
  <Genre>${comicInfo.genre}</Genre>
  <Tags>${comicInfo.tags}</Tags>

  <!-- ===== 网址与扫描信息 ===== -->
  <Web>${comicInfo.web}</Web>

  <!-- ===== 语言与格式 ===== -->
  <LanguageISO>${comicInfo.languageIso}</LanguageISO>
</ComicInfo>`;
            // 5、写入压缩包
            await injectComicInfo(file, comicInfoXml);
        }
    };
    let search = {
        /**
         * 关键字搜索
         * @param keyword                   关键字
         * @param page                      第几页
         * @param sort {SearchSort}         排序
         * @return {Promise<{content: JmSearchMeta}>}
         */
        byKeyword: async (keyword, page = 1, sort= SearchSort.Latest) => {
            // 1、请求到内容
            let resp = await expireRetry(async () => {
                return await apiClient.get(`${getApiHost()}/search?${toQueryString({
                    "main_tag": 0,
                    "search_query": keyword,
                    "page": page,
                    "o": sort,
                })}`);
            });
            // 2、获取总数，列表
            let {
                search_query,
                total,
                content
            } = resp?.data?.data || {};
            // 3、获取元信息
            return {
                search_query,
                total,
                content,
                // pageSize固定为80，手动计算总页数
                pages: Math.ceil(total / 80)
            };
        }
    };
    let rank = {
        /**
         * 获取每周必看期数
         * @returns {Promise<{JmWeekInfo}>}
         */
        weekInfo: async() => {
            let resp = await expireRetry(async () => {
                return await apiClient.get(`${getApiHost()}/week`);
            });
            return resp.data.data;
        },
        /**
         * 获取每周必看
         * @param categoryId
         * @param typeId
         * @returns {Promise<{total: *, list: JmSearchMeta[]}>}
         */
        weekly: async (categoryId, typeId) => {
            let resp = await expireRetry(async () => {
                return await apiClient.get(`${getApiHost()}/week/filter?${toQueryString({
                    "id": categoryId,
                    "type": typeId
                })}`);
            });
            let {
                total,
                list
            } = resp?.data?.data || {};
            return {
                total,
                list
            }
        },
        /**
         * @param date
         * 分类与排行
         */
        serialization: async (date, page = 1) => {
            let data = await expireRetry(async () => {
                let resp = await apiClient.get(`${getApiHost()}/serialization?type=all&date=${date}&page=${page}`);
                let body = resp.data.data;
                if (body && body.error) {
                    return { list: [], error: body.error };
                }
                return { list: body.list || [] };
            });
            (data?.list || []).forEach((obj) => {
                obj.is_favorite = obj.favorite;
            });
            return data;
        },
        /**
         * 分类与排行
         */
        categories: async () => {
            let resp = await expireRetry(async () => {
                return await apiClient.get(`${getApiHost()}/categories`);
            });
            return resp.data.data;
        },
        /**
         * 获取分类
         * @param page      页码
         * @param time      时间段，t今天、w本周、m本月、a全部
         * @param category  分类
         * @param order_by  排序  mr最新、mv最多观看、mp最多图片、tr总排行、md最多评论、tf最多爱心
         * @param sub_category  子分类（暂不支持）
         * @returns {Promise<void>}
         */
        categoriesFilter: async (page, time, category, order_by, sub_category) => {
            // 移动端不支持 sub_category
            // o: mv, mv_m, mv_w, mv_t
            let o = 'a' !== time
                ? `${order_by}_${time}`
                : order_by;
            let c = category ? category : undefined;
            if (c && sub_category) c += '_' + sub_category;
            let resp = await expireRetry(async () => {
                return await apiClient.get(`${getApiHost()}/categories/filter?${toQueryString({
                    'page': page,
                    'order': '',  // 该参数为空
                    'c': c,
                    'o': o
                })}`);
            });
            let {
                total,
                content
            } = resp.data.data || {};
            return {
                total,
                content,
                // pageSize固定为80，手动计算总页数
                pages: Math.ceil(total / 80)
            }
        },
        /**
         * 获取最新发布
         * @param page  页码
         * @returns {Promise<{total: *, content: *}>}
         */
        latest: async (page) => {
            let resp = await expireRetry(async () => {
                return await apiClient.get(`${getApiHost()}/latest?page=${page}`);
            });
            return resp.data.data || [];
        }
    };

    const forum = {
        feed: async (mode = 'all', page = 1) => {
            let resp = await expireRetry(async () => {
                return await apiClient.get(`${getApiHost()}/forum`, {
                    params: { mode, page }
                });
            });
            return resp.data.data || { list: [], total: 0 };
        },
        list: async (aid, page = 1) => {
            let resp = await expireRetry(async () => {
                return await apiClient.get(`${getApiHost()}/forum`, {
                    params: { mode: 'all', page, aid }
                });
            });
            return resp.data.data || { list: [], total: 0 };
        },
        byUser: async (uid, page = 1) => {
            let resp = await expireRetry(async () => {
                return await apiClient.get(`${getApiHost()}/forum`, {
                    params: { uid, page }
                });
            });
            return resp.data.data || { list: [], total: 0 };
        },
        post: async (comment, aid, comment_id) => {
            const fd = new FormData();
            fd.append('comment', comment);
            fd.append('aid', String(aid));
            if (comment_id) fd.append('comment_id', String(comment_id));
            let resp = await expireRetry(async () => {
                return await apiClient.post(`${getApiHost()}/comment`, fd, {
                    headers: fd.getHeaders()
                });
            });
            return resp.data.data || {};
        }
    };

    const promote = {
        list: async () => {
            let resp = await expireRetry(async () => {
                return await apiClient.get(`${getApiHost()}/promote`);
            });
            return resp.data.data || [];
        },
        sections: async () => {
            return [
                { id: '10', title: '推广10' },
                { id: '13', title: '推广13' },
                { id: '26', title: '推广26' },
                { id: '27', title: '推广27' },
                { id: '28', title: '推广28' },
                { id: '29', title: 'C107&推荐本本' },
                { id: '30', title: '禁漫去码&全彩化' },
                { id: '31', title: '推广31' },
                { id: '32', title: '推广32' },
                { id: '33', title: '推广33' },
                { id: '34', title: '推广34' },
                { id: '35', title: '推广35' },
                { id: '36', title: '推广36' },
                { id: '37', title: '推广37' },
                { id: '38', title: '推广38' },
            ];
        },
        promoteList: async (id, page = 1) => {
            const apiPage = Math.max(0, page - 1);
            let data = await expireRetry(async () => {
                let resp = await apiClient.get(`${getApiHost()}/promote_list?id=${id}&page=${apiPage}`);
                let body = resp.data.data;
                if (!body) return { total: 0, list: [] };
                return { total: parseInt(body.total || '0', 10), list: body.list || [] };
            });
            (data?.list || []).forEach((obj) => {
                obj.is_favorite = obj.is_favorite || obj.favorite;
            });
            return data;
        }
    };

    return {
        httpClient,
        close,
        init,
        fetchRemoteFile,
        account,
        comic,
        search,
        rank,
        forum,
        promote,
        fetchLatestApiHosts
    };
}

module.exports = {
    createCrawler
};
