#!/usr/bin/env node
/**
 * 构建 core 单文件可执行程序（jm.core.exe）
 *
 * 与 pkg-icon.mjs 的区别：
 * - 用 spawn（非 execSync）调用 pkg，避免 Windows 上 55MB 损坏 exe 的已知问题
 * - pkg 模板版本动态获取，不再硬编码 v22.22.3
 * - 模板缺失时自动下载（复用 desktop 侧同样的 forceFetch 策略）
 * - 产物做基本校验（存在 + 大小合理）
 *
 * 用法：node build/build-exe.mjs
 * 前置：已执行 build/build.mjs（需要 dist/jm.core.all.js）
 */
import * as ResEdit from 'resedit';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const _require = createRequire(import.meta.url);
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const BUNDLE = path.join(DIST, 'jm.core.all.js');
const OUTPUT = path.join(DIST, 'jm.core.exe');
const ICON = path.resolve(ROOT, '..', '..', 'resources', 'icon.ico');
const CACHE_DIR = path.join(os.homedir(), '.pkg-cache', 'v3.6');
const LANG = 1033;
const CODEPAGE = 1200;

function compareVersion(a, b) {
  const pa = a.match(/v(\d+)\.(\d+)\.(\d+)/).slice(1).map(Number);
  const pb = b.match(/v(\d+)\.(\d+)\.(\d+)/).slice(1).map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

function findTemplate() {
  const list = fs.existsSync(CACHE_DIR) ? fs.readdirSync(CACHE_DIR) : [];
  const fetched = list.filter((f) => /^fetched-v\d+\.\d+\.\d+-win-x64$/.test(f)).sort(compareVersion).pop();
  if (fetched) {
    return {
      fetchedPath: path.join(CACHE_DIR, fetched),
      builtPath: path.join(CACHE_DIR, fetched.replace(/^fetched-/, 'built-')),
    };
  }
  const built = list.filter((f) => /^built-v\d+\.\d+\.\d+-win-x64$/.test(f)).sort(compareVersion).pop();
  if (built) return { fetchedPath: null, builtPath: path.join(CACHE_DIR, built) };
  return null;
}

async function ensureTemplate() {
  let tpl = findTemplate();
  if (tpl) return tpl;

  console.log('   pkg 模板不存在，正在下载 node22-win-x64 预编译模板 ...');
  const pkgFetch = _require('@yao-pkg/pkg-fetch');
  fs.mkdirSync(CACHE_DIR, { recursive: true });
  try {
    await pkgFetch.need({ nodeRange: 'node22', platform: 'win', arch: 'x64', forceFetch: true });
  } catch (e) {
    throw new Error(`pkg 模板下载失败：${e.message || e}`);
  }
  tpl = findTemplate();
  if (!tpl) throw new Error(`下载完成但未找到模板（${CACHE_DIR}）`);
  return tpl;
}

/** 给模板写入图标 + 版本信息（必须在 pkg 之前，否则会破坏快照） */
function patchTemplate(builtPath, version, appTitle, company) {
  const [major, minor, patch] = String(version).split('.').map((n) => Number(n) || 0);
  const exe = ResEdit.NtExecutable.from(fs.readFileSync(builtPath), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exe);

  if (fs.existsSync(ICON)) {
    const icoBuf = fs.readFileSync(ICON);
    const count = icoBuf.readUInt16LE(4);
    const entries = [];
    for (let i = 0; i < count; i++) {
      const off = 6 + i * 16;
      entries.push(ResEdit.Data.IconItem.from(icoBuf, icoBuf.readUInt32LE(off + 12), icoBuf.readUInt32LE(off + 8)));
    }
    const group = res.entries.find((e) => e.type === 14);
    ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, group ? group.id : 1, LANG, entries);
  }

  const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  if (viList.length > 0) {
    const vi = viList[0];
    vi.setFileVersion(major, minor, patch, 0, LANG);
    vi.setProductVersion(major, minor, patch, 0, LANG);
    vi.setStringValues(
      { lang: LANG, codepage: CODEPAGE },
      {
        FileDescription: appTitle,
        ProductName: appTitle,
        CompanyName: company,
        ProductVersion: String(version),
        FileVersion: String(version),
        OriginalFilename: 'jm.core.exe',
        InternalName: appTitle,
        LegalCopyright: `© ${new Date().getFullYear()} ${company}`,
      }
    );
    vi.outputToResourceEntries(res.entries);
  }

  res.outputResource(exe);
  fs.writeFileSync(builtPath, Buffer.from(exe.generate()));
}

(async () => {
  console.log('📦 构建 jm.core.exe');

  if (!fs.existsSync(BUNDLE)) {
    console.error('❌ 未找到', BUNDLE);
    console.error('   请先执行: npm run build');
    process.exit(1);
  }

  const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

  // 1. 预补丁模板
  const tpl = await ensureTemplate();
  const BAK = tpl.fetchedPath ? tpl.fetchedPath + '.build-bak' : null;
  if (tpl.fetchedPath) fs.copyFileSync(tpl.fetchedPath, tpl.builtPath);
  patchTemplate(tpl.builtPath, pack.version, 'jm.core', pack.author || 'pigman18');
  console.log('   ✓ 模板已补丁:', path.basename(tpl.builtPath));

  // 2. 隐藏 fetched，强制 pkg 使用 built
  if (tpl.fetchedPath) {
    try { if (fs.existsSync(BAK)) fs.unlinkSync(BAK); } catch {}
    fs.renameSync(tpl.fetchedPath, BAK);
  }

  // 3. 调 pkg（spawn，不用 execSync）
  const pkgBin = _require.resolve('@yao-pkg/pkg/lib-es5/bin.js');
  try {
    await new Promise((resolve, reject) => {
      const proc = spawn(process.execPath, [
        pkgBin,
        BUNDLE,
        '--target', 'node22-win-x64',
        '--output', OUTPUT,
      ], { stdio: 'inherit', windowsHide: true });
      proc.on('close', (code) => (code === 0 ? resolve() : reject(new Error(`pkg 退出码 ${code}`))));
      proc.on('error', reject);
    });
  } finally {
    // 恢复 fetched
    if (tpl.fetchedPath && BAK && fs.existsSync(BAK)) {
      try { if (fs.existsSync(tpl.fetchedPath)) fs.unlinkSync(tpl.fetchedPath); } catch {}
      fs.renameSync(BAK, tpl.fetchedPath);
    }
  }

  // 4. 校验
  if (!fs.existsSync(OUTPUT)) {
    console.error('❌ 未生成', OUTPUT);
    process.exit(1);
  }
  const sizeMB = fs.statSync(OUTPUT).size / 1024 / 1024;
  if (sizeMB < 20) {
    console.error(`❌ 产物大小异常: ${sizeMB.toFixed(1)} MB（疑似损坏）`);
    process.exit(1);
  }
  console.log(`✅ jm.core.exe (${sizeMB.toFixed(2)} MB)`);
})().catch((e) => {
  console.error('❌ 构建失败:', e.message || e);
  process.exit(1);
});
