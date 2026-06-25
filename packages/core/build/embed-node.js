// scripts/embed-node.js
const fs = require('fs');
const path = require('path');

const bundleRoot = path.join(__dirname, '..');
const repoRoot = path.join(bundleRoot, '../../');
const nodePath = path.resolve(repoRoot, 'node_modules/taskbar-progress/build/Release/taskbar_progress.node');
const outPath = path.resolve(bundleRoot, 'embed/taskbar_progress_embed.js');

const data = fs.readFileSync(nodePath);
const base64 = data.toString('base64');

fs.writeFileSync(
    outPath,
    `module.exports = "${base64}";\n`
);

console.log('✅ .node embedded');
