#!/usr/bin/env node
/**
 * 测试运行器
 *
 * 只跑 packages 的单元/集成测试（test/*.test.js），
 * 跳过 test/ 下的历史手工脚本（需联网或人工介入）。
 *
 * 用法：npm test
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const TEST_DIR = path.join(ROOT, 'test');

const files = fs.readdirSync(TEST_DIR)
    .filter((f) => f.endsWith('.test.js'))
    .sort();

if (files.length === 0) {
    console.error('未找到测试文件（test/*.test.js）');
    process.exit(1);
}

let failed = 0;
for (const f of files) {
    const full = path.join(TEST_DIR, f);
    console.log(`\n━━━ ${f} ━━━`);
    const r = spawnSync(process.execPath, [full], { stdio: 'inherit' });
    if (r.status !== 0) {
        failed++;
        console.error(`✗ ${f} 失败 (exit ${r.status})`);
    }
}

console.log(`\n${'='.repeat(50)}`);
if (failed > 0) {
    console.error(`✗ ${failed}/${files.length} 个测试文件失败`);
    process.exit(1);
}
console.log(`✓ 全部 ${files.length} 个测试文件通过`);
