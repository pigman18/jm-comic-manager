#!/usr/bin/env node
/**
 * 版本号同步脚本
 *
 * 唯一来源：仓库根 package.json 的 version。
 * 本脚本把该版本号写入各子包 package.json，避免多处手工维护导致不一致。
 *
 * 用法：
 *   node scripts/sync-version.mjs          # 同步
 *   node scripts/sync-version.mjs --check  # 只检查，不一致时退出码 1（可用于 CI）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const checkOnly = process.argv.includes('--check');

const TARGETS = [
  'packages/core/package.json',
  'packages/web/package.json',
  'packages/desktop/package.json',
];

const rootPkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));
const version = rootPkg.version;
if (!version) {
  console.error('✗ 根 package.json 缺少 version');
  process.exit(1);
}

let dirty = 0;
for (const rel of TARGETS) {
  const file = path.join(ROOT, rel);
  if (!fs.existsSync(file)) {
    console.warn(`- 跳过（不存在）: ${rel}`);
    continue;
  }
  const raw = fs.readFileSync(file, 'utf-8');
  const pkg = JSON.parse(raw);
  if (pkg.version === version) {
    console.log(`✓ ${rel} 已是 ${version}`);
    continue;
  }
  dirty++;
  if (checkOnly) {
    console.error(`✗ ${rel} 版本为 ${pkg.version}，应为 ${version}`);
    continue;
  }
  pkg.version = version;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
  console.log(`✓ ${rel} ${pkg.version === version ? '' : ''}→ ${version}`);
}

if (checkOnly && dirty > 0) {
  console.error(`\n共 ${dirty} 个包版本不一致`);
  process.exit(1);
}
console.log(`\n完成，版本号：${version}`);
