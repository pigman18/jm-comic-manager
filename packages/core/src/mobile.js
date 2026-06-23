const crypto = require('crypto');

/**
 * 禁漫常量
 */
class JmMagicConstants {
    // 搜索参数-排序
    static ORDER_BY_LATEST = 'mr';
    static ORDER_BY_VIEW = 'mv';
    static ORDER_BY_PICTURE = 'mp';
    static ORDER_BY_LIKE = 'tf';
    // 下面这两个目前只在网页上看到，app上没有
    static ORDER_BY_SCORE = 'tr';
    static ORDER_BY_COMMENT = 'md';

    static ORDER_MONTH_RANKING = 'mv_m';
    static ORDER_WEEK_RANKING = 'mv_w';
    static ORDER_DAY_RANKING = 'mv_t';

    // 搜索参数-时间段
    static TIME_TODAY = 't';
    static TIME_WEEK = 'w';
    static TIME_MONTH = 'm';
    static TIME_ALL = 'a';

    // 分类参数API接口的category
    static CATEGORY_ALL = '0';  // 全部
    static CATEGORY_DOUJIN = 'doujin';  // 同人
    static CATEGORY_SINGLE = 'single';  // 单本
    static CATEGORY_SHORT = 'short';  // 短篇
    static CATEGORY_ANOTHER = 'another';  // 其他
    static CATEGORY_HANMAN = 'hanman';  // 韩漫
    static CATEGORY_MEIMAN = 'meiman';  // 美漫
    static CATEGORY_DOUJIN_COSPLAY = 'doujin_cosplay';  // cosplay
    static CATEGORY_3D = '3D';  // 3D
    static CATEGORY_ENGLISH_SITE = 'english_site';  // 英文站

    // 副分类
    static SUB_CHINESE = 'chinese';  // 汉化，通用副分类
    static SUB_JAPANESE = 'japanese';  // 日语，通用副分类

    // 其他类（CATEGORY_ANOTHER）的副分类
    static SUB_ANOTHER_OTHER = 'other';  // 其他漫画
    static SUB_ANOTHER_3D = '3d';  // 3D
    static SUB_ANOTHER_COSPLAY = 'cosplay';  // cosplay

    // 同人（SUB_CHINESE）的副分类
    static SUB_DOUJIN_CG = 'CG';  // CG
    static SUB_DOUJIN_CHINESE = JmMagicConstants.SUB_CHINESE;
    static SUB_DOUJIN_JAPANESE = JmMagicConstants.SUB_JAPANESE;

    // 短篇（CATEGORY_SHORT）的副分类
    static SUB_SHORT_CHINESE = JmMagicConstants.SUB_CHINESE;
    static SUB_SHORT_JAPANESE = JmMagicConstants.SUB_JAPANESE;

    // 单本（CATEGORY_SINGLE）的副分类
    static SUB_SINGLE_CHINESE = JmMagicConstants.SUB_CHINESE;
    static SUB_SINGLE_JAPANESE = JmMagicConstants.SUB_JAPANESE;
    static SUB_SINGLE_YOUTH = 'youth';

    // 图片分割参数
    static SCRAMBLE_220980 = 220980;
    static SCRAMBLE_268850 = 268850;
    static SCRAMBLE_421926 = 421926;  // 2023-02-08后改了图片切割算法

    // 移动端API密钥
    static APP_TOKEN_SECRET = '18comicAPP';
    static APP_TOKEN_SECRET_2 = '18comicAPPContent';
    static APP_DATA_SECRET = '185Hcomic3PAPP7R';
    static API_DOMAIN_SERVER_SECRET = 'diosfjckwpqpdfjkvnqQjsik';
    static APP_VERSION = '2.0.21';
}

/**
 * 获取加密请求头
 * @param uri
 * @return {{headers: {tokenparam: *, token: *}, ts: number}}
 */
function decideHeadersAndTs(uri) {
    // 获取时间戳
    let ts = new Date().getTime();
    let {
        token,
        tokenparam
    } = tokenAndTokenparam(ts, uri === '/chapter_view_template' ? JmMagicConstants.APP_TOKEN_SECRET_2 : JmMagicConstants.APP_TOKEN_SECRET);
    //  设置headers
    return {
        ts: ts,
        headers: {
            'token': token,
            'tokenparam': tokenparam,
        }
    }
}

/**
 * 计算禁漫接口的请求headers的token和tokenparam
 *
 * @param ts 时间戳
 * @param ver app版本
 * @param secret 密钥
 * @return (token, tokenparam)
 */
function tokenAndTokenparam(ts, secret = JmMagicConstants.APP_TOKEN_SECRET, ver = JmMagicConstants.APP_VERSION) {
    // tokenparam: 1700566805,1.6.3
    const tokenparam = `${ts},${ver}`;
    // token: 81498a20feea7fbb7149c637e49702e3
    const token = md5hex(`${ts}${secret}`);
    return {
        token, tokenparam
    };
}

/**
 * 解密接口返回值
 *
 * @param {string} data resp.json()['data']
 * @param {number|string} ts 时间戳
 * @param {string} [secret]
 * @return {string} json格式的字符串
 */
function decodeDomainServerData(data, ts) {
    // 1. base64解码
    const dataB64 = Buffer.from(data, 'base64');
    // 2. AES-ECB解密
    const keyHex = md5hex(`${JmMagicConstants.API_DOMAIN_SERVER_SECRET}`);
    const key = Buffer.from(keyHex, 'utf-8'); // ✅ 完全对齐 Python
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, null);
    let decrypted = decipher.update(dataB64);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    // 3. 移除末尾的padding
    // const padLen = decrypted[decrypted.length - 1];
    // const result = decrypted.slice(0, -padLen);
    // 4. 解码为字符串 (json)
    let res = decrypted.toString('utf-8');
    return tryParseJsonObject(res);
}

/**
 * 解密接口返回值
 *
 * @param {string} data resp.json()['data']
 * @param {number|string} ts 时间戳
 * @param {string} [secret]
 * @return {string} json格式的字符串
 */
function decodeRespData(data, ts, secret= JmMagicConstants.APP_DATA_SECRET) {
    // 1. base64解码
    const dataB64 = Buffer.from(data, 'base64');
    // 2. AES-ECB解密
    const keyHex = md5hex(`${ts}${secret}`);
    const key = Buffer.from(keyHex, 'utf-8'); // ✅ 完全对齐 Python
    const decipher = crypto.createDecipheriv('aes-256-ecb', key, null);
    let decrypted = decipher.update(dataB64);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    // 3. 移除末尾的padding
    // const padLen = decrypted[decrypted.length - 1];
    // const result = decrypted.slice(0, -padLen);
    // 4. 解码为字符串 (json)
    let res = decrypted.toString('utf-8');
    return tryParseJsonObject(res);
}

/**
 * @param {string} key
 * @return {string}
 */
function md5hex(key) {
    // key参数需为字符串
    if (typeof key !== 'string') {
        throw new Error('key参数需为字符串');
    }

    return crypto.createHash('md5').update(key, 'utf-8').digest('hex');
}


/**
 * 尝试从响应文本中解析 JSON 对象
 *
 * @param {string} respText
 * @return {object}
 */
function tryParseJsonObject(respText) {
    const text = respText.trim();
    // fast case
    if (text.startsWith('{') && text.endsWith('}')) {
        return JSON.parse(text);
    } else if (text.startsWith('[') && text.endsWith(']')) {
        return JSON.parse(text);
    }
    const pattern = /\{[\s\S]*?\}/g;
    for (const match of text.matchAll(pattern)) {
        try {
            return JSON.parse(match[0]);
        } catch (e) {
            console.error('parse_json_object.error', e);
        }
    }
    throw new Error(
        `未解析出json数据: ${limitText(respText, 200)}`
    );
}

function limitText(text, limit) {
    const length = text.length;
    return length <= limit
        ? text
        : text.slice(0, limit) + `...(${length - limit})`;
}


module.exports = {
    tokenAndTokenparam,
    decodeDomainServerData,
    decodeRespData,
    decideHeadersAndTs,
    JmMagicConstants
};
