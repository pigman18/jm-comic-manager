const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');
const {touchFileSync, renameSync} = require('./file');
let {logStart, logRunning, logDone, logError, logProgress, logDoneProgress} = require('./log');

/**
 * 拉取全部分页数据
 * @param fn
 * @param startPage 开始页码
 */
async function fetchAllPageData(fn, startPage = 1) {
    let result = [];
    // 1、查询首页
    let pageInfo1 = await fn(startPage);
    result.push(...(pageInfo1.list || []));
    // 2、加载剩余页码
    let nextStartPage = startPage + 1;
    let endPage = pageInfo1.pages;
    let pages = Array.from({length: endPage - nextStartPage + 1}, (_, i) => nextStartPage + i);
    // 3、处理剩余分页
    for (let page of pages) {
        let pageInfo = await fn(page);
        result.push(...(pageInfo.list || []));
    }
    return result;
}

/**
 * 转换拼接链接
 * @param params
 * @return {string}
 */
function toQueryString(params) {
    if (!params || typeof params !== 'object') return '';
    return Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null)
        .map(([key, value]) =>
            `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
        )
        .join('&');
}

/**
 * 获取CDN链接的原始链接
 * @param cdnUrl {string}       CDN链接
 * @param host {string}         原始域名
 * @param cdnHosts {string[]}   多个CDN域名
 * @return {string}
 */
function cdn2OriginUrl(cdnUrl, host, cdnHosts) {
    if (!cdnUrl) {
        return cdnUrl;
    }
    if (!cdnUrl.startsWith(host)) {
        return cdnUrl;
    }
    let cdnHost = cdnHosts[Math.floor(Math.random() * cdnHosts.length)];
    return cdnUrl.split(host).join(cdnHost);
}

/**
 * 获取普通响应流的内容
 * @param {*} response
 * @returns {Promise<string>}
 */
async function getAxiosResponseText(response) {
    const chunks = [];
    for await (const chunk of response.data) {
        chunks.push(chunk);
    }
    return Buffer.concat(chunks).toString('utf-8');
}

/**
 * 给 response.stream 增加“假死检测”
 * @param {AxiosResponse} response
 * @param {number} timeoutMs 最大静默时间（ms）
 * @returns {AxiosResponse}
 */
function guardStream(response, timeoutMs = 30_000) {
    const stream = response.data;
    if (!stream || typeof stream.on !== 'function') {
        return response;
    }

    const controller = new AbortController();
    let lastTick = Date.now();

    const timer = setInterval(() => {
        if (Date.now() - lastTick > timeoutMs) {
            clearInterval(timer);
            controller.abort();
            stream.destroy(new Error('stream stalled'));
        }
    }, 5000);

    stream.on('data', () => {
        lastTick = Date.now();
    });

    stream.on('end', () => {
        clearInterval(timer);
    });

    stream.on('error', () => {
        clearInterval(timer);
    });

    // ✅ 只挂 signal，不碰 request
    if (response.request && typeof response.request.abort === 'function') {
        response.request.abort = () => controller.abort();
    }

    return response;
}

/**
 * 获取响应流
 * @param response
 * @param options
 * @return {Promise<*>}
 */
async function getResponseStream(response, options = {}) {
    const {
        onProgress,
        withLog = false,
        filename,
    } = options;

    const name = filename || 'unknown';
    withLog && logStart(`${name} 下载`);

    const totalLenRaw = response.headers['content-length'];
    const totalLength = totalLenRaw ? parseInt(String(totalLenRaw), 10) : 0;
    let downloadedLength = 0;

    const stream = response.data;

    // ✅ 关键：用 Promise 包裹 stream 生命周期
    const done = new Promise((resolve, reject) => {
        stream.on('data', chunk => {
            downloadedLength += chunk.length;
            withLog && logProgress(`${name} 下载`, downloadedLength, totalLenRaw);
            onProgress?.({
                complete: downloadedLength,
                total: totalLength
            });
        });

        stream.on('end', () => {
            withLog && logDoneProgress(`${name} 下载`);
            onProgress?.({
                complete: downloadedLength,
                total: totalLength || downloadedLength
            });
            resolve();
        });

        stream.on('error', err => {
            withLog && logError(`${name} 下载`, err);
            reject(err);
        });
    });

    // ✅ 返回 stream，但函数本身会等完成
    stream.done = done;
    return stream;
}

/**
 * 保存响应流
 * @param {*} response
 * @param {string} dataPath
 * @param {string} bakDataPath
 * @param onProgress
 */
async function saveAxiosResponse(response, dataPath, bakDataPath = dataPath + ".bak", onProgress = (complete, total) => {}) {
    touchFileSync(bakDataPath);
    let fileName = path.basename(dataPath);
    const totalLenRaw = response.headers['content-length'];
    const totalLength = totalLenRaw ? parseInt(String(totalLenRaw), 10) : 0;
    let downloadedLength = 0;
    const writer = fs.createWriteStream(bakDataPath);
    response.data.on('data', chunk => {
        downloadedLength += chunk.length;
        if (onProgress) onProgress({complete: downloadedLength, total: totalLength});
    });
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
        writer.on('finish', () => {
            if (fs.existsSync(bakDataPath)) {
                try {
                    fs.renameSync(bakDataPath, dataPath);
                } catch (e) {
                    fs.rmSync(bakDataPath);
                    reject(e);
                }
            }
            if (onProgress) {
                try {
                    const st = require('node:fs').statSync(dataPath);
                    onProgress({complete: st.size, total: st.size});
                } catch {
                    onProgress({
                        complete: downloadedLength,
                        total: totalLength || downloadedLength,
                    });
                }
            }
            resolve();
        });
        writer.on('error', (err) => {
            fs.rmSync(bakDataPath);
            reject(err);
        });
    });
}

/**
 * 链接转保存路径
 * @param url                   链接
 * @param dir                   基础路径
 * @param withIncludeHost       是否包含域名
 * @return {string}
 */
function url2DataPath(url, dir = "/data", withIncludeHost = true) {
    if (url.indexOf('?') !== -1) {
        url = url.split('?')[0];
    }
    if (!withIncludeHost) {
        return `${dir}/${url.replace(/^https?:\/\/[^/]+/, '')}`;
    }
    let filePath = url.split('https://').join('')
        .split('http://').join('/');
    if (filePath.indexOf(':') !== -1) {
        filePath = filePath.split(":").join('--');
    }
    return `${dir}/${filePath}`;
}

/**
 * 获取文件名适合的mime
 * @param file
 * @return {string}
 */
function getMime(file) {
    const lower = String(file).toLowerCase();
    if (lower.endsWith('.html')) return 'text/html; charset=utf-8';
    if (lower.endsWith('.js')) return 'text/javascript; charset=utf-8';
    if (lower.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
    if (lower.endsWith('.css')) return 'text/css; charset=utf-8';
    if (lower.endsWith('.json')) return 'application/json; charset=utf-8';
    if (lower.endsWith('.svg')) return 'image/svg+xml';
    if (lower.endsWith('.png')) return 'image/png';
    if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
    if (lower.endsWith('.webp')) return 'image/webp';
    if (lower.endsWith('.woff2')) return 'font/woff2';
    if (lower.endsWith('.woff')) return 'font/woff';
    if (lower.endsWith('.ico')) return 'image/x-icon';
    return 'application/octet-stream';
}

let Http = {

    getFinalUrl(url) {
        if (url.indexOf('?') !== -1) {
            url = url.split('?')[0];
        }
        return url;
    },

    /**
     * 下载文件
     * @param urls
     * @param dir
     * @param mockAxios
     * @return {Promise<void>}
     */
    async downloadFiles(urls, dir = "/data", mockAxios = axios) {
        let complete = 0;
        for (let url of urls) {
            if (!!url) {
                // 1、调用下载
                await Http.downloadFile(url, dir, mockAxios);
            }
            // 2、打印总进度
            complete += 1;
            console.log(`========== 文件列表进度：${complete} / ${urls.length} ==========`)
        }
    },

    async checkImageUrl(url) {
        try {
            const response = await axios.head(url, {
                timeout: 5000, // 5秒超时
                validateStatus: (status) => true, // 不抛出错误，返回所有状态码
            });
            const {status, headers} = response;
            if (status === 200) {
                const contentType = headers['content-type'] || '';
                const contentLength = headers['content-length'] || 0;
                // 检查是否是图片类型
                const isImage = contentType.startsWith('image/');
                return {
                    valid: isImage,
                    status,
                    contentType,
                    contentLength: parseInt(contentLength),
                    message: isImage ? '有效的图片URL' : 'URL有效但不是图片',
                };
            } else {
                return {
                    valid: false,
                    status,
                    message: `HTTP状态码错误: ${status}`,
                };
            }
        } catch (error) {
            return {
                valid: false,
                error: error.message,
                message: '网络错误或URL无效',
            };
        }
    }
};

/**
 * 无侵入 axios 重试包装器
 * @param {Function} fn axios 请求方法
 * @param {number} retries 重试次数
 * @param {number} delay 初始延迟 ms
 */
function withRetry(fn, retries = 3, delay = 1000) {
    return async (...args) => {
        let lastError;

        for (let i = 0; i <= retries; i++) {
            try {
                return await fn(...args);
            } catch (err) {
                lastError = err;

                // ✅ 只对 502 / 504 / 代理失败重试
                const shouldRetry =
                    err.response?.status === 502 ||
                    err.response?.status === 504 ||
                    err.code === 'ECONNABORTED' ||
                    err.code === 'ECONNRESET';

                if (!shouldRetry || i === retries) {
                    throw err;
                }

                await new Promise(r => setTimeout(r, delay * (i + 1)));
            }
        }

        throw lastError;
    };
}

/**
 * 断点续传下载
 * @param url               下载链接
 * @param filePath          保存路径
 * @param options           透传至 axios，额外支持 onProgress, proxy
 * @return {Promise<string>} 最终文件路径
 */
function createAbortError() {
    const err = new Error('download aborted');
    err.name = 'AbortError';
    err.__isAbort = true;
    return err;
}

async function downloadResume(url, filePath, options = {}) {
    const { onProgress, proxy, signal, ...axiosOpts } = options;
    let resumeSize = 0;
    const tmpPath = filePath + '.tmp';

    if (signal?.aborted) throw createAbortError();

    // 检测已有部分文件
    if (fs.existsSync(tmpPath)) {
        try { resumeSize = fs.statSync(tmpPath).size; } catch { resumeSize = 0; }
    } else if (fs.existsSync(filePath)) {
        return filePath;
    }

    const headers = { ...(axiosOpts.headers || {}) };
    if (resumeSize > 0) headers['Range'] = `bytes=${resumeSize}-`;

    const axiosConfig = {
        ...axiosOpts,
        url,
        method: 'GET',
        responseType: 'stream',
        headers,
        ...(proxy ? { proxy: false, httpsAgent: new (require('https-proxy-agent').HttpsProxyAgent)(proxy) } : {}),
    };

    if (signal?.aborted) throw createAbortError();
    const resp = await axios(axiosConfig);

    if (signal?.aborted) {
        resp.data?.destroy?.();
        throw createAbortError();
    }

    const supportRange = resp.status === 206;
    const totalLen = parseInt(resp.headers['content-length'] || '0', 10);
    const totalSize = supportRange ? resumeSize + totalLen : (totalLen || 0);

    const doPipe = (writer) => {
        resp.data.pipe(writer);
        return new Promise((resolve, reject) => {
            const onAbort = () => {
                resp.data?.destroy?.();
                writer?.destroy?.();
                reject(createAbortError());
            };
            if (signal) {
                if (signal.aborted) { onAbort(); return; }
                signal.addEventListener('abort', onAbort, { once: true });
            }
            writer.on('finish', () => {
                renameSync(tmpPath, filePath);
                resolve();
            });
            writer.on('error', (err) => { reject(err); });
            resp.data.on('error', (err) => { reject(err); });
        });
    };

    if (supportRange) {
        const writer = fs.createWriteStream(tmpPath, { flags: 'a' });
        let downloaded = resumeSize;
        resp.data.on('data', chunk => { downloaded += chunk.length; onProgress?.({ complete: downloaded, total: totalSize }); });
        await doPipe(writer);
    } else {
        if (resumeSize > 0) { try { fs.rmSync(tmpPath); } catch {} resumeSize = 0; }
        const writer = fs.createWriteStream(tmpPath);
        let downloaded = 0;
        resp.data.on('data', chunk => { downloaded += chunk.length; onProgress?.({ complete: downloaded, total: totalSize }); });
        await doPipe(writer);
    }
    return filePath;
}

module.exports = {
    cdn2OriginUrl,
    saveAxiosResponse,
    getResponseStream,
    getAxiosResponseText,
    url2DataPath,
    getMime,
    withRetry,
    toQueryString,
    fetchAllPageData,
    guardStream,
    downloadResume,
    ...Http
};
