// Fetch 18comic.vip categories page to see actual params
'use strict';

(async () => {
    const host = 'https://18comic.vip';
    const url = `${host}/categories`;
    console.log(`Fetching ${url}...`);
    try {
        const resp = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        const html = await resp.text();
        // Find API calls in the HTML
        const apiMatches = html.matchAll(/categories\/filter[^"']*/g);
        for (const m of apiMatches) {
            console.log('  Found in HTML:', m[0]);
        }
        // Also search for /api/ or /v1/ patterns
        const apiUrlMatches = html.matchAll(/https?:\/\/[^"'\s]+(?:categories|filter|api)[^"'\s]*/g);
        for (const m of apiUrlMatches) {
            console.log('  API URL:', m[0]);
        }
        // Look for sort/order parameters
        const sortMatches = html.matchAll(/sort[^"'\s&]*[=][^"'\s&]*/g);
        for (const m of sortMatches) {
            console.log('  sort param:', m[0]);
        }
        // Look for the main JS chunk
        const jsMatches = html.matchAll(/src="([^"]+\.js[^"]*)"/g);
        for (const m of jsMatches) {
            if (!m[1].includes('chunk') || m[1].includes('main')) {
                console.log('  JS:', m[1]);
            }
        }
        console.log(`HTML length: ${html.length}`);
    } catch (e) {
        console.log(`Error: ${e.message}`);
    }
})().catch(console.error);
