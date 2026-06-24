// 网页 URL 有 t=a 参数。APK 的 Categories 组件不传 t，
// 但网页可能传了 extra 参数。测试带 t= 的变体
'use strict';

const crypto = require('crypto');
const apiHost = (process.argv[2] || '').replace(/\/+$/, '');
if (!apiHost) { process.exit(1); }

const ts = Math.floor(Date.now() / 1000);
const headers = {
    'Accept': 'application/json',
    'Tokenparam': `${ts},2.0.25`,
    'Token': crypto.createHash('md5').update(String(ts) + '185Hcomic3PAPP7R').digest('hex'),
};

function decrypt(enc, secret) {
    const keyStr = crypto.createHash('md5').update(String(ts) + secret).digest('hex');
    const key = Buffer.from(keyStr, 'utf-8');
    const d = crypto.createDecipheriv('aes-256-ecb', key, null);
    d.setAutoPadding(true);
    let r = d.update(enc, 'base64', 'utf-8');
    r += d.final('utf-8');
    return JSON.parse(r);
}

async function api(url) {
    const resp = await fetch(url, { headers });
    const json = JSON.parse(await resp.text());
    if (json.code !== 200 || !json.data) return null;
    for (const secret of ['185Hcomic3PAPP7R', '18comicAPPContent']) {
        try { return decrypt(json.data, secret); } catch {}
    }
    return null;
}

(async () => {
    // 网页 URL: /albums?t=a&o=tr
    // 测试各种带 t 参数 + o 的组合
    console.log('=== 带 t=a 参数 ===\n');

    const sorts = [['最新', 'mr'], ['最多点阅', 'mv'], ['最多图片', 'mp'],
                   ['最高评分', 'tr'], ['最多评论', 'md'], ['最多爱心', 'tf']];

    const cValues = [['不传c', ''], ['c=', 'c='], ['c=&t=a', 'c=&t=a'], 
                     ['c=&t=a&order=', 'c=&t=a&order=']];

    for (const [sortLabel, o] of sorts) {
        console.log(`--- ${sortLabel} (o=${o}) ---`);
        for (const [cLabel, cSuffix] of cValues) {
            const qs = cSuffix ? `o=${o}&${cSuffix}` : `o=${o}`;
            const url = `${apiHost}/categories/filter?page=1&${qs}`;
            const data = await api(url);
            if (data) {
                const content = data.content || data.list || data.data || [];
                const ids = Array.isArray(content) ? content.slice(0, 3).map(c => c.id).join(', ') : '?';
                console.log(`  ${cLabel.padEnd(24)} → [${ids}] total=${data.total}`);
            }
        }
        console.log();
    }

    // 额外: 尝试 /albums 作为 API 端点（网页路由名可能也是 API 端点名）
    console.log('=== /albums 端点 ===');
    for (const o of ['mr', 'mv', 'mp', 'tr', 'md', 'tf']) {
        const url = `${apiHost}/albums?page=1&o=${o}&t=a`;
        const data = await api(url);
        if (data) {
            const content = data.content || data.list || data.data || [];
            const ids = Array.isArray(content) ? content.slice(0, 3).map(c => c.id).join(', ') : '?';
            console.log(`  o=${o} → [${ids}] total=${data.total}`);
        } else {
            console.log(`  o=${o} → 失败`);
        }
    }
})().catch(console.error);
