const {mergeCookie} = require('../util/cookie');
const {saveAxiosResponse} = require('../util/http');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const axios = require('axios');
const {decideHeadersAndTs, tokenAndTokenparam, decodeRespData} = require('../jm.bundle/core/mobile');

/**
 * 创建 http 请求客户端
 */
function createHttpClient(config) {
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
        cfg.headers['user-agent'] = config.userAgent;
        cfg.headers['cookie'] = config.cookie;
        cfg.headers['accept'] = 'text/html,application/json,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7';
        return cfg;
    });
    // 4、拦截请求进行处理
    httpClient.interceptors.response.use(
        (response) => {
            // 5、请求成功，模拟浏览器追加 cookie
            if (200 === response.status) {
                let resCookies = response.headers['set-cookie'] || [];
                // 响应头的过期时间必须比现在大才能追加
                for (let resCookie of resCookies) {
                    if (!!resCookie) {
                        let flag1 = resCookie.includes('remember');
                        let flag2 = resCookie.includes(config.username);
                        let flag = !flag1 || (flag1 && flag2);
                        if (flag) {
                            // console.log(`追加 cookie：${resCookie}`);
                            config.cookie = mergeCookie(config.cookie, resCookie);
                        }
                    }
                }
            }
            return response;
        },
        (error) => {
            // ❌ 请求失败
            return Promise.reject(error);
        }
    );
    return httpClient;
}

// 移动端图片域名
let DOMAIN_IMAGE_LIST = [
    'cdn-msp.jmapiproxy1.cc',
    'cdn-msp.jmapiproxy2.cc',
    'cdn-msp2.jmapiproxy2.cc',
    'cdn-msp3.jmapiproxy2.cc',
    'cdn-msp.jmapinodeudzn.net',
    'cdn-msp3.jmapinodeudzn.net',
];

// 移动端API域名
let DOMAIN_API_LIST = [
    'www.cdnhjk.net',
    'www.cdngwc.cc',
    'www.cdngwc.net',
    'www.cdngwc.club',
    'www.cdnhjk.cc',
];

// 获取最新移动端API域名的地址
let API_URL_DOMAIN_SERVER_LIST = [
    'https://rup4a04-c01.tos-ap-southeast-1.bytepluses.com/newsvr-2025.txt',
    'https://rup4a04-c02.tos-cn-hongkong.bytepluses.com/newsvr-2025.txt'
];

let config = {
    userAgent: 'Mozilla/5.0 (Linux; Android 9; V1938CT Build/PQ3A.190705.11211812; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/91.0.4472.114 Safari/537.36',
    username: 'pigman17',
    password: 'qq123456',
    proxy: 'http://127.0.0.1:10809'
};
let httpClient = createHttpClient(config);

async function reqApi(uri, get = true) {
    let {
        ts,
        headers
    } = decideHeadersAndTs(uri);
    let resp;
    if (get) {
        resp = await httpClient.get(`https://www.cdnhjk.net${uri}`, {
            headers: {
                ...headers
            }
        });
    } else {
        resp = await httpClient.post(`https://www.cdnhjk.net${uri}`, {
            headers: {
                ...headers
            }
        });
    }
    let data = resp?.data?.data || '';
    if (!data) {
        return null;
    }
    if (Array.isArray(data) && data.length === 0) {
        return null;
    }
    return  decodeRespData(resp?.data?.data || '', ts);
}

(async () => {
    let formData = new FormData();
    formData.append("username", config.username);
    formData.append("password", config.password);
    formData.append("submit_login", String(1));
    // 记住密码 +180 天
    formData.append("id_remember", "on");
    formData.append("login_remember", "on");
    let apiResponse = await httpClient.post('https://www.cdnhjk.net/login', formData);
    if (apiResponse.status !== 200) {
        throw ERR.LOGIN_API_FAILED;
    }
    let resp1 = await reqApi('/album?id=1434235');
    let resp2 = await reqApi('/album?id=1224005');
    // let url = `https://${DOMAIN_IMAGE_LIST[Math.floor(Math.random() * DOMAIN_IMAGE_LIST.length)]}/media/albums/1441017.jpg?u=1779420336`;
    let url = `https://cdn-msp2.18comic.vip/media/albums/1441017.jpg?u=1779420336`;
    const response = await httpClient({
        url,
        method: 'GET',
        responseType: 'stream',
    });
    await saveAxiosResponse(response, "test.jpg", "test.jpg.bak");
    return {
        newCookie: config.cookie
    };
})();
