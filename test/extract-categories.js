// 提取 Header.tsx - 这是 Categories 页面用的头部组件
'use strict';
const fs = require('fs');
const path = require('path');

const mapPath = path.join(__dirname, '..', 'resources', 'jm-api', 'chunks', '3704.e565c928.chunk.js.map');
const map = JSON.parse(fs.readFileSync(mapPath, 'utf-8'));

const sources = map.sources || [];
const sourcesContent = map.sourcesContent || [];

// 找 Header.tsx (source 2)
for (let i = 0; i < sources.length; i++) {
    const name = sources[i];
    if (name && (name.includes('Header.tsx') || name.includes('Header'))) {
        console.log(`========== ${name} ==========`);
        const content = sourcesContent[i] || '';
        const lines = content.split('\n');
        console.log(`(${lines.length} lines)`);
        console.log(content);
    }
}
