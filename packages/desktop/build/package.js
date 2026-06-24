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

// pkg cache
const CACHE_DIR = path.join(os.homedir(), '.pkg-cache', 'v3.6');
const FETCHED = path.join(CACHE_DIR, 'fetched-v22.22.3-win-x64');
const BUILT = path.join(CACHE_DIR, 'built-v22.22.3-win-x64');
const FETCHED_BAK = FETCHED + '.build-bak';
const ICON = path.join(ROOT, 'icon.ico');

function copyRecursive(src, dest) {
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dest, e.name);
    if (e.isDirectory()) copyRecursive(s, d); else fs.copyFileSync(s, d);
  }
}

function restoreFetched() {
  if (fs.existsSync(FETCHED_BAK)) {
    if (fs.existsSync(FETCHED)) fs.unlinkSync(FETCHED);
    fs.renameSync(FETCHED_BAK, FETCHED);
  }
}

fs.mkdirSync(outputDir, { recursive: true });

// ── Step 1: Patch pkg cache template with custom icon ──────────────
// (pattern from packages/core/build/pkg-icon.mjs)
console.log('🎨 Step 1: Patching pkg cache template with icon...');
if (!fs.existsSync(FETCHED)) {
  console.error('Fetched template not found at', FETCHED);
  process.exit(1);
}
fs.copyFileSync(FETCHED, BUILT);
const exeData = fs.readFileSync(BUILT);
const exe = ResEdit.NtExecutable.from(exeData);
const res = ResEdit.NtExecutableResource.from(exe);
const icoBuf = fs.readFileSync(ICON);
const count = icoBuf.readUInt16LE(4);
const iconEntries = [];
for (let i = 0; i < count; i++) {
const off = 6 + i * 16;
iconEntries.push(ResEdit.Data.IconItem.from(icoBuf, icoBuf.readUInt32LE(off + 12), icoBuf.readUInt32LE(off + 8)));
}
const iconGroupEntry = res.entries.find(e => e.type === 14);
const iconGroupId = iconGroupEntry ? iconGroupEntry.id : 1;
ResEdit.Resource.IconGroupEntry.replaceIconsForResource(res.entries, iconGroupId, 1033, iconEntries);
res.outputResource(exe);
fs.writeFileSync(BUILT, Buffer.from(exe.generate()));
console.log('   ✓ Template patched:', BUILT);

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

// Hide fetched so pkg uses built
fs.renameSync(FETCHED, FETCHED_BAK);

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
