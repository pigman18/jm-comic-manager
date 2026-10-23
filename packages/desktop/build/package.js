#!/usr/bin/env node
import * as ResEdit from 'resedit';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const _require = createRequire(__filename);

const outputDir = path.join(ROOT, 'dist');
const outputExe = path.join(outputDir, 'JM漫画管理器.exe');
const ICON = path.join(ROOT, 'icon.ico');
const LANG = 1033;
const CODEPAGE = 1200;
const CACHE_DIR = path.join(os.homedir(), '.pkg-cache', 'v3.6');

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyRecursive(s, d); else fs.copyFileSync(s, d);
  }
}

function compareVersion(a, b) {
  const pa = a.match(/v(\d+)\.(\d+)\.(\d+)/).slice(1).map(Number);
  const pb = b.match(/v(\d+)\.(\d+)\.(\d+)/).slice(1).map(Number);
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i];
  return 0;
}

// 找到 pkg-fetch 实际会使用的模板（node22 → 缓存里最新的 fetched/built）
function findTemplate() {
  const list = fs.existsSync(CACHE_DIR) ? fs.readdirSync(CACHE_DIR) : [];
  const fetched = list.filter(f => /^fetched-v\d+\.\d+\.\d+-win-x64$/.test(f)).sort(compareVersion).pop();
  if (fetched) {
    return { fetchedPath: path.join(CACHE_DIR, fetched), builtPath: path.join(CACHE_DIR, fetched.replace(/^fetched-/, 'built-')) };
  }
  const built = list.filter(f => /^built-v\d+\.\d+\.\d+-win-x64$/.test(f)).sort(compareVersion).pop();
  if (built) return { fetchedPath: null, builtPath: path.join(CACHE_DIR, built) };
  throw new Error(`未找到 pkg 模板（${CACHE_DIR}），请先确保 pkg-fetch 已缓存 node22-win-x64 模板`);
}

// 直接在 pkg 模板上写入应用图标与版本信息。
// 必须在 pkg 打包【之前】做：pkg 会在模板末尾追加应用快照，
// 若事后用 resedit/rcedit 修改最终 exe，会破坏/截断该快照导致程序无法启动。
function patchTemplate(builtPath, version, appTitle, company) {
  const [major, minor, patch] = String(version).split('.').map(n => Number(n) || 0);

  const exe = ResEdit.NtExecutable.from(fs.readFileSync(builtPath), { ignoreCert: true });
  const res = ResEdit.NtExecutableResource.from(exe);

  // 图标
  const icoBuf = fs.readFileSync(ICON);
  const count = icoBuf.readUInt16LE(4);
  const iconEntries = [];
  for (let i = 0; i < count; i++) {
    const off = 6 + i * 16;
    iconEntries.push(ResEdit.Data.IconItem.from(icoBuf, icoBuf.readUInt32LE(off + 12), icoBuf.readUInt32LE(off + 8)));
  }
  const iconGroupEntry = res.entries.find(e => e.type === 14);
  const iconGroupId = iconGroupEntry ? iconGroupEntry.id : 1;
  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, iconGroupId, LANG, iconEntries);

  // 版本信息（覆盖 Node.js 默认值）
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
        OriginalFilename: 'JM漫画管理器.exe',
        LegalCopyright: `© ${new Date().getFullYear()} ${company}`,
      }
    );
    vi.outputToResourceEntries(res.entries);
  }

  res.outputResource(exe);
  fs.writeFileSync(builtPath, Buffer.from(exe.generate()));
}

fs.mkdirSync(outputDir, { recursive: true });
const pack = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf-8'));

// ── Step 1: 预补丁 pkg 模板（图标 + 版本信息）─────────────────────
console.log('🎨 Step 1: Patching pkg template (icon + version info)...');
const tpl = findTemplate();
const FETCHED_BAK = tpl.fetchedPath ? tpl.fetchedPath + '.build-bak' : null;
if (tpl.fetchedPath) {
  fs.copyFileSync(tpl.fetchedPath, tpl.builtPath);
}
patchTemplate(tpl.builtPath, pack.version, 'JM漫画管理器', pack.author || 'pigman18');
console.log(`   ✓ Template patched: ${tpl.builtPath}`);

function restoreFetched() {
  if (tpl.fetchedPath && FETCHED_BAK && fs.existsSync(FETCHED_BAK)) {
    if (fs.existsSync(tpl.fetchedPath)) fs.unlinkSync(tpl.fetchedPath);
    fs.renameSync(FETCHED_BAK, tpl.fetchedPath);
  }
}

// ── Step 2: Run pkg (uses patched template) ───────────────────────
console.log('\n🔨 Step 2: Running pkg...');

// Generate CJS bootstrap for ESM
const absEntry = path.resolve(path.join(ROOT, 'app.js')).replace(/\\/g, '/');
const tempBootstrap = path.join(ROOT, '.pkg-bootstrap.cjs');
fs.writeFileSync(tempBootstrap,
  `const { pathToFileURL } = require('url');\n` +
  `import(pathToFileURL('${absEntry}').href);\n`
);

// pkg config
const nativePath = (() => {
  try {
    const p = _require.resolve('ewvjs');
    return path.join(path.dirname(path.dirname(p)), 'native');
  } catch { return null; }
})();

const pkgConfig = { assets: ['package.json', `${path.join(ROOT, 'runtime')}/**/*`], scripts: ['./app.js'] };
if (nativePath && fs.existsSync(nativePath)) pkgConfig.assets.push(`${nativePath}/**/*`);

const pkgCfgPath = path.join(ROOT, '.pkg-config.json');
fs.writeFileSync(pkgCfgPath, JSON.stringify(pkgConfig, null, 2));

// 隐藏 fetched，强制 pkg 使用已补丁的 built 模板
if (tpl.fetchedPath) {
  try { if (fs.existsSync(FETCHED_BAK)) fs.unlinkSync(FETCHED_BAK); } catch {}
  fs.renameSync(tpl.fetchedPath, FETCHED_BAK);
}

try {
  const pkgBin = _require.resolve('@yao-pkg/pkg/lib-es5/bin.js');
    await new Promise((resolve, reject) => {
    const proc = spawn(process.execPath, [
      pkgBin,
      tempBootstrap,
      '--target', 'node22-win-x64',
      '--output', outputExe,
      '--public',
      '--no-bytecode',
      '--fallback-to-source',
      '--config', pkgCfgPath,
    ], { stdio: 'inherit', shell: false });
    proc.on('close', code => code === 0 ? resolve() : reject(new Error(`pkg exited with code ${code}`)));
    proc.on('error', reject);
  });
} finally {
  restoreFetched();
  try { fs.unlinkSync(pkgCfgPath); } catch {}
  try { fs.unlinkSync(tempBootstrap); } catch {}
}

console.log('   ✓ Executable created');

// ── Step 3: Copy assets ───────────────────────────────────────────
console.log('\n📁 Step 3: Copying assets...');
if (nativePath && fs.existsSync(nativePath)) {
  copyRecursive(nativePath, path.join(outputDir, 'native'));
  console.log('   ✓ Native DLLs copied');
}
const runtimeSrc = path.join(ROOT, 'runtime');
if (fs.existsSync(runtimeSrc)) {
  copyRecursive(runtimeSrc, path.join(outputDir, 'runtime'));
  console.log('   ✓ Runtime files copied');
}
// 运行期窗口/托盘图标由原生层读取真实文件，必须与 exe 放在同一目录
if (fs.existsSync(ICON)) {
  fs.copyFileSync(ICON, path.join(outputDir, 'icon.ico'));
  console.log('   ✓ icon.ico copied');
}

// ── Step 4: Patch subsystem to GUI (2) ─────────────────────────
console.log('\n🪟 Step 4: Patching subsystem to GUI...');
const subBuf = fs.readFileSync(outputExe);
const subPeOffset = subBuf.readUInt32LE(0x3C);
const subOff = subPeOffset + 24 + 68;
const subCur = subBuf.readUInt16LE(subOff);
if (subCur === 2) {
  console.log('   Subsystem already GUI (2), skipping');
} else {
  subBuf.writeUInt16LE(2, subOff);
  fs.writeFileSync(outputExe, subBuf);
  console.log('   ✓ Patched subsystem from', subCur, 'to 2 (GUI)');
}

// ── Step 5: Create ZIP archive ────────────────────────────────────
console.log('\n📦 Step 5: Creating archive...');
const { default: archiver } = await import('archiver');
const archivePath = path.join(outputDir, 'JM漫画管理器.zip');
await new Promise((resolve, reject) => {
  const output = fs.createWriteStream(archivePath);
  const archive = archiver('zip', { zlib: { level: 9 } });
  output.on('close', resolve);
  archive.on('error', reject);
  archive.pipe(output);
  archive.directory(outputDir, false, entry => entry.name !== 'JM漫画管理器.zip' ? entry : false);
  archive.finalize();
});
const sizeMB = (fs.statSync(archivePath).size / 1024 / 1024).toFixed(2);
console.log(`   ✓ Archive created: ${sizeMB} MB`);

console.log('\n✅ Done:', outputExe);
