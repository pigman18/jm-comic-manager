// 测试 /categories/filter 接口到底接受什么参数名
// 运行: node test/test-categories-filter.mjs

import { JmBundle } from '../packages/core/src/index.js';

async function main() {
    const bundle = await JmBundle.create({
        dataDir: './data',
        config: {}
    });
    const crawler = bundle.crawler;
    const apiHost = crawler.apiHost;

    console.log('API Host:', apiHost);

    // 测试不同的参数名组合
    const tests = [
        // 第一组: o/c (APK source map 里的名字)
        { page: 1, o: 'mv', c: 'doujin' },
        { page: 1, o: 'mv', c: '' },
        { page: 1, o: '', c: '' },
        // 第二组: slug/sort (Postman 集合里的名字)
        { page: 1, sort: 'mv', slug: 'doujin' },
        { page: 1, sort: 'mv', slug: '' },
        { page: 1, sort: 'mv_m', slug: '' },
        { page: 1, sort: 'mp_w', slug: '' },
        { page: 1, sort: '', slug: '' },
        // 第三组: 混合
        { page: 1, o: 'mv', slug: 'doujin' },
        { page: 1, sort: 'mv', c: 'doujin' },
    ];

    for (const params of tests) {
        const qs = Object.entries(params)
            .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
            .join('&');
        const url = `${apiHost}/categories/filter?${qs}`;
        try {
            const resp = await fetch(url, {
                headers: {
                    'Accept': 'application/json',
                }
            });
            const text = await resp.text();
            // 尝试解析 JSON
            try {
                const json = JSON.parse(text);
                console.log(`✅ ${qs} → code=${json.code}, hasData=${!!json.data}, keys=${Object.keys(json.data || {}).join(',')}`);
            } catch {
                // 可能被加密了，但至少 HTTP 通了
                console.log(`⚠ ${qs} → HTTP ${resp.status}, body=${text.slice(0, 100)}`);
            }
        } catch (e) {
            console.log(`❌ ${qs} → ${e.message}`);
        }
    }

    bundle.close();
}

main().catch(console.error);
