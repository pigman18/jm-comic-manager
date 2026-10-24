#!/usr/bin/env node
/**
 * 编译 Inno Setup 安装包
 *
 * 替代 package.json 里硬编码的 postpackage 命令：
 * - 自动在常见安装路径查找 ISCC.exe
 * - 支持环境变量 ISCC_PATH 覆盖（CI 用）
 * - 找不到时给出明确提示，而不是让 npm 报一句无法理解的错误
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const ISS = path.join(ROOT, 'setup.iss');

const CANDIDATES = [
    process.env.ISCC_PATH,
    'C:\\Program Files (x86)\\Inno Setup 6\\ISCC.exe',
    'C:\\Program Files\\Inno Setup 6\\ISCC.exe',
    'C:\\Program Files (x86)\\Inno Setup 5\\ISCC.exe',
    'C:\\Program Files\\Inno Setup 5\\ISCC.exe',
].filter(Boolean);

const iscc = CANDIDATES.find((p) => {
    try { return fs.existsSync(p); } catch { return false; }
});

if (!iscc) {
    console.error('❌ 未找到 Inno Setup 编译器 (ISCC.exe)');
    console.error('   已查找以下位置：');
    for (const c of CANDIDATES) console.error('     - ' + c);
    console.error('\n   解决方式（任选其一）：');
    console.error('   1. 安装 Inno Setup 6: https://jrsoftware.org/isdl.php');
    console.error('   2. 设置环境变量 ISCC_PATH 指向 ISCC.exe');
    console.error('   3. 仅构建免安装版：跳过本步骤（zip 与 exe 已生成）');
    process.exit(1);
}

if (!fs.existsSync(ISS)) {
    console.error('❌ 未找到 setup.iss:', ISS);
    process.exit(1);
}

console.log(`📦 编译安装包: ${iscc}`);
const r = spawnSync(iscc, [ISS], { cwd: ROOT, stdio: 'inherit', windowsHide: true });
if (r.status !== 0) {
    console.error('❌ 安装包编译失败');
    process.exit(r.status ?? 1);
}

// 输出产物位置
const installerDir = path.join(ROOT, 'installer');
if (fs.existsSync(installerDir)) {
    const files = fs.readdirSync(installerDir).filter((f) => f.endsWith('.exe'));
    for (const f of files) {
        const full = path.join(installerDir, f);
        const mb = (fs.statSync(full).size / 1024 / 1024).toFixed(2);
        console.log(`✅ 安装包: ${f} (${mb} MB)`);
    }
}
