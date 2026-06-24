// 全面测试：A漫(全部分类) 所有排序选项的第一个结果
// 用户说所有测试都是在 A漫（全部分类）下
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
    // 用户测试的 sort 列表及其对应的 o 值
    const sortTests = [
        ['最新', 'mr'],
        ['最多订阅', 'tf'],
        ['最多图片', 'mp'],
        ['最高评分', 'tr'],
        ['最多评论', 'md'],
        ['最多爱心', 'tf'],
    ];

    // A漫 = 全部分类: 不传 c 或传 c="" 的效果
    // 目前有三种方式表示"全部分类"
    const cModes = [
        { label: '不传c', c: undefined },
        { label: 'c=""', c: '' },
        { label: 'c=0 (A漫id)', c: '0' },
    ];

    console.log('=== A漫(全部分类) 所有排序选项 ===\n');

    for (const [sortLabel, oVal] of sortTests) {
        console.log(`--- ${sortLabel} (o=${oVal}) ---`);
        for (const { label, c } of cModes) {
            const cpart = c !== undefined ? `&c=${c}` : '';
            const url = `${apiHost}/categories/filter?page=1&o=${oVal}${cpart}`;
            const data = await api(url);
            if (data) {
                const content = data.content || data.list || data.data || [];
                const first = Array.isArray(content) && content.length > 0 ? content[0].id : '-';
                const note = first === 1448266 ? ' ← 用户最新' :
                             first === 1114751 ? ' ← 用户订阅/爱心' :
                             first === 235953 ? ' ← 用户最多图片' :
                             first === 65536 ? ' ← 用户评分/评论' :
                             first === 612208 ? ' ← A漫id过滤' : '';
                console.log(`  ${label} → first=${first} total=${data.total}${note}`);
            } else {
                console.log(`  ${label} → 失败`);
            }
        }
        console.log();
    }

    // 额外测试: 所有分类 slug 的 tr 和 md 排序
    console.log('=== 各分类下 tr(md) 排序第一个结果 ===');
    const catSlugs = ['', '0', 'doujin', 'single', 'short', 'another', 'hanman', 'meiman', 'hanmansfw', 'another_cosplay', '3D'];
    for (const slug of catSlugs) {
        for (const o of ['tr', 'md']) {
            const cpart = slug === '' ? '' : `&c=${slug}`;
            const url = `${apiHost}/categories/filter?page=1&o=${o}${cpart}`;
            const data = await api(url);
            if (data) {
                const content = data.content || data.list || data.data || [];
                const first = Array.isArray(content) && content.length > 0 ? content[0].id : '-';
                const match = first === 65536 ? ' ← 65536!' : '';
                console.log(`  o=${o} c=${JSON.stringify(slug || '(空)')} → first=${first} total=${data.total}${match}`);
            }
        }
    }
})().catch(console.error);
