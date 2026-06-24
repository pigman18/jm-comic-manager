// 打印返回的全量第一条数据，看结构差异
'use strict';
const crypto = require('crypto');
const apiHost = (process.argv[2] || '').replace(/\/+$/, '');
if (!apiHost) { process.exit(1); }

const ts = Math.floor(Date.now() / 1000);
const headers = {
    'Accept': 'application/json',
    'Tokenparam': `${ts},2.0.25`,
    'Token': crypto.createHash('md5').update(String(ts) + '185Hcomic3PAPP7R').digest('hex'),
    'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJTRVNTSU9OIjp7ImltZ19ob3N0IjoxLCJsYW5ndWFnZSI6ImNuX0NTIiwidWlkIjo1MzAzNzE4LCJ1c2VybmFtZSI6InBpZ21hbjE3IiwiZW1haWwiOiJhMjg2MjQyNDQ3MEBnbWFpbC5jb20iLCJlbWFpbHZlcmlmaWVkIjoieWVzIiwiZm5hbWUiOiIiLCJnZW5kZXIiOiJNYWxlIiwibWVzc2FnZSI6IldlbGNvbWUgcGlnbWFuMTchIiwibm9hZHN0aW1lIjoiMDAwMC0wMC0wMCAwMDowMDowMCIsInBob3RvIjoiNTMwMzcxOC5qcGciLCJ1cGRhdGVfYXQiOiIxNzgxNjAzNjU1In0sImV4cCI6MTgxMzc1MzExMX0=.HWGKgYRRGVOhQzr0uqgCqe6voBN6u6GQSmL36RvulUY=`,
    'Cookie': 'AVS=4hrk7svkiukc4fqith3dh405db',
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
    // 对比 c="" 和 c=doujin 在 o=tr 下的第一条数据
    for (const c of ['', 'doujin', '0', 'short']) {
        const url = `${apiHost}/categories/filter?page=1&o=tr&c=${encodeURIComponent(c)}`;
        const data = await api(url);
        if (data) {
            const content = data.content || data.list || data.data || [];
            const first = content[0];
            console.log(`\n=== c=${JSON.stringify(c)} first item ===`);
            if (first) {
                console.log(JSON.stringify(first, null, 2));
            } else {
                console.log('(no items)');
            }
            console.log(`\ntotal=${data.total}, tags=${data.tags?.length || 0}`);
        }
    }
})().catch(console.error);
