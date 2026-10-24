'use strict';
/**
 * 路由清单对比：拆分前(HEAD) vs 拆分后(工作区)
 * 用法：node test/route-parity.js
 */
const { execSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const ROUTE_RE = /app\.(get|post|put|delete)\(\s*`\$\{api\}([^`]+)`/g;
const WS_RE = /app\.ws\(\s*`\$\{api\}([^`]+)`/g;

function extractFromSource(src) {
  const out = new Set();
  for (const m of src.matchAll(ROUTE_RE)) {
    out.add(`${m[1].toUpperCase()} ${m[2]}`);
  }
  for (const m of src.matchAll(WS_RE)) {
    out.add(`WS ${m[1]}`);
  }
  return out;
}

// 拆分前：从 git HEAD 读取 server.js
let beforeSrc = '';
try {
  beforeSrc = execSync('git show HEAD:packages/core/src/server.js', { cwd: ROOT, encoding: 'utf-8' });
} catch (e) {
  console.error('无法读取 HEAD 版本的 server.js:', e.message);
  process.exit(2);
}
const before = extractFromSource(beforeSrc);

// 拆分后：汇总 server.js + routes/*.js
const srcDir = path.join(ROOT, 'packages', 'core', 'src');
const files = [path.join(srcDir, 'server.js')];
const routesDir = path.join(srcDir, 'routes');
for (const f of fs.readdirSync(routesDir)) {
  if (f.endsWith('.js')) files.push(path.join(routesDir, f));
}
const after = new Set();
for (const f of files) {
  for (const r of extractFromSource(fs.readFileSync(f, 'utf-8'))) after.add(r);
}

const missing = [...before].filter((r) => !after.has(r)).sort();
const added = [...after].filter((r) => !before.has(r)).sort();

console.log(`拆分前路由数: ${before.size}`);
console.log(`拆分后路由数: ${after.size}`);

if (missing.length) {
  console.log(`\n❌ 丢失的路由 (${missing.length}):`);
  for (const r of missing) console.log(`   - ${r}`);
}
if (added.length) {
  console.log(`\n⚠️  新增的路由 (${added.length}):`);
  for (const r of added) console.log(`   + ${r}`);
}
if (!missing.length && !added.length) {
  console.log('\n✅ 路由集合完全一致');
}
process.exit(missing.length > 0 ? 1 : 0);
