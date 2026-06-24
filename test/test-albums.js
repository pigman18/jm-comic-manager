// 测试 /albums API 端点（带登录态）
'use strict';
const crypto = require('crypto');
const apiHost = (process.argv[2] || '').replace(/\/+$/, '');
if (!apiHost) { process.exit(1); }

const ts = Math.floor(Date.now() / 1000);
const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJTRVNTSU9OIjp7ImltZ19ob3N0IjoxLCJsYW5ndWFnZSI6ImNuX0NTIiwidWlkIjo1MzAzNzE4LCJ1c2VybmFtZSI6InBpZ21hbjE3IiwiZW1haWwiOiJhMjg2MjQyNDQ3MEBnbWFpbC5jb20iLCJlbWFpbHZlcmlmaWVkIjoieWVzIiwiZm5hbWUiOiIiLCJnZW5kZXIiOiJNYWxlIiwibWVzc2FnZSI6IldlbGNvbWUgcGlnbWFuMTchIiwibm9hZHN0aW1lIjoiMDAwMC0wMC0wMCAwMDowMDowMCIsInBob3RvIjoiNTMwMzcxOC5qcGciLCJ1cGRhdGVfYXQiOiIxNzgxNjAzNjU1In0sImV4cCI6MTgxMzc1MzExMX0=.HWGKgYRRGVOhQzr0uqgCqe6voBN6u6GQSmL36RvulUY=';

const headers = {
    'Accept': 'application/json',
    'Tokenparam': `${ts},2.0.25`,
    'Token': crypto.createHash('md5').update(String(ts) + '185Hcomic3PAPP7R').digest('hex'),
    'Authorization': `Bearer ${token}`,
    'Cookie': 'AVS=4hrk7svkiukc4fqith3dh405db',
};

async function test(url, label) {
    const resp = await fetch(url, { headers });
    const text = await resp.text();
    try {
        const json = JSON.parse(text);
        console.log(`${label} → code=${json.code} data=${typeof json.data} ${(json.msg||'').slice(0,30)}`);
        return json;
    } catch {
        console.log(`${label} → NOT JSON: ${text.slice(0, 60)}`);
        return null;
    }
}

(async () => {
    console.log('=== 测试 /albums 端点 ===\n');
    
    // 测试 /albums 会不会是 API
    await test(`${apiHost}/albums?page=1&o=tr`, '/albums?o=tr');
    await test(`${apiHost}/albums?page=1&o=tr&t=a`, '/albums?o=tr&t=a');
    await test(`${apiHost}/albums?page=1&o=tr&c=`, '/albums?o=tr&c=');
    await test(`${apiHost}/albums`, '/albums');

    // 也测试各种其它路径
    console.log('\n=== 其它可能路径 ===');
    await test(`${apiHost}/album_filter?page=1&o=tr`, '/album_filter');
    await test(`${apiHost}/album_list?page=1&o=tr`, '/album_list');
    await test(`${apiHost}/albums/filter?page=1&o=tr`, '/albums/filter');
    await test(`${apiHost}/comic_list?page=1&o=tr`, '/comic_list');
    await test(`${apiHost}/rank_list?page=1&o=tr`, '/rank_list');
})().catch(console.error);
