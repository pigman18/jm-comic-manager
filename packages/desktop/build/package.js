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
  return null;
}

/**
 * 确保 pkg 模板存在。
 *
 * CI / 全新机器上没有 ~/.pkg-cache，需要先拉取一次。
 * 使用 pkg-fetch 的 `need({forceFetch:true})`：
 *   - 只走「下载预编译二进制」路径，绝不触发从源码编译
 *     （编译需要 patch 命令 + VS 工具链，Windows 上必然失败）
 *   - 下载失败会明确报错，而不是静默转入编译
 */
async function ensureTemplate() {
  let tpl = findTemplate();
  if (tpl) return tpl;

  console.log('   pkg 模板不存在，正在下载 node22-win-x64 预编译模板 ...');
  const pkgFetch = _require('@yao-pkg/pkg-fetch');
  const nodeVersion = pkgFetch.getNodeVersion('node22');
  const fetchedName = `fetched-${nodeVersion}-win-x64`;
  const fetchedPath = path.join(CACHE_DIR, fetchedName);
  fs.mkdirSync(CACHE_DIR, { recursive: true });

  try {
    // 注意：不要传 output —— 它是「缓存目录」，need() 会在其下拼 node-<ver>-<platform>-<arch>。
    // 传错会生成 fetched-xxx/ 目录而不是 fetched-xxx 文件。
    const result = await pkgFetch.need({
      nodeRange: 'node22',
      platform: 'win',
      arch: 'x64',
      forceFetch: true,   // 关键：禁止编译，只下载
    });
    console.log('   ✓ 模板下载完成:', result);
  } catch (e) {
    throw new Error(
      `pkg 模板下载失败：${e.message || e}\n` +
      `   可手动下载后放到: ${CACHE_DIR}\n` +
      `   下载地址: https://github.com/yao-pkg/pkg-fetch/releases/download/v3.6/${nodeVersion}-win-x64`
    );
  }

  tpl = findTemplate();
  if (!tpl) {
    throw new Error(`下载完成但未找到模板（${CACHE_DIR}）`);
  }
  console.log('   ✓ 模板已就绪:', path.basename(tpl.builtPath));
  return tpl;
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
        InternalName: appTitle,
        LegalCopyright: `© ${new Date().getFullYear()} ${company}`,
      }
    );
    vi.outputToResourceEntries(res.entries);
  }

  res.outputResource(exe);
  fs.writeFileSync(builtPath, Buffer.from(exe.generate()));
}

// 清理旧产物：dist 里残留的上一版文件会污染判断（且会被打进 zip）
if (fs.existsSync(outputDir)) {
  for (const name of fs.readdirSync(outputDir)) {
    // 保留 native/（体积大、每次重新拷贝即可）
    try { fs.rmSync(path.join(outputDir, name), { recursive: true, force: true }); } catch {}
  }
}
fs.mkdirSync(outputDir, { recursive: true });

// 版本号唯一来源：根 package.json
const ROOT_PKG = path.join(ROOT, '..', '..', 'package.json');
const pack = JSON.parse(fs.readFileSync(ROOT_PKG, 'utf-8'));

// 生成 version.iss 供 setup.iss 引用，避免安装包版本号手工维护
{
  const versionIss = path.join(ROOT, 'version.iss');
  fs.writeFileSync(
    versionIss,
    `; 自动生成，请勿手改（来源：根 package.json）\n#define MyAppVersion "${pack.version}"\n`,
    'utf-8'
  );
  console.log(`📌 Version: ${pack.version} (generated version.iss)`);
}

// ── Step 1: 预补丁 pkg 模板（图标 + 版本信息）─────────────────────
console.log('🎨 Step 1: Patching pkg template (icon + version info)...');
const tpl = await ensureTemplate();
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

// ── Step 2: Sync runtime bundle from core ────────────────────────
// runtime/jm.core.all.cjs 是构建产物（不再纳入 git），打包前从 core/dist 自动同步，
// 避免依赖人工复制导致版本漂移。
console.log('\n🔗 Step 2: Syncing runtime bundle from core...');
{
  const coreBundle = path.join(ROOT, '..', 'core', 'dist', 'jm.core.all.js');
  const runtimeDir = path.join(ROOT, 'runtime');
  const runtimeBundle = path.join(runtimeDir, 'jm.core.all.cjs');
  if (!fs.existsSync(coreBundle)) {
    console.error('   ✗ 未找到 core 产物：', coreBundle);
    console.error('   请先在 packages/core 执行 npm run build');
    process.exit(1);
  }
  fs.mkdirSync(runtimeDir, { recursive: true });
  fs.copyFileSync(coreBundle, runtimeBundle);
  const mb = (fs.statSync(runtimeBundle).size / 1024 / 1024).toFixed(2);
  console.log(`   ✓ runtime bundle synced: ${mb} MB`);
}

// ── Step 3: Bundle app.js → 单文件 CJS，再交给 pkg ────────────────
console.log('\n🔨 Step 3: Bundling + running pkg...');

// ⚠️ 为什么先用 esbuild 打成单文件，而不是直接把 app.js 交给 pkg：
//
// 历史坑（CI 真机复现，1.0.2 发布版同样中招）：
// 旧做法生成 .pkg-bootstrap.cjs，内容是 import(pathToFileURL('<构建机绝对路径>'))。
// pkg 靠静态分析决定哪些文件进快照：
//   - 绝对路径是字面量 → 能分析到 → 文件进快照，但 exe 绑死构建机路径，
//     换机器就 ERR_MODULE_NOT_FOUND 启动即崩；
//   - 改成 __dirname 相对 → pkg 不做运行时求值、分析不出来 → 文件不进快照，
//     同样启动即崩（Cannot find module 'C:\snapshot\...\app.js'）。
//
// 也试过直接把 ESM 的 app.js 当 pkg 入口：单层目录能跑，但本项目的入口位于
// packages/desktop/ 子目录，pkg 的快照层级会错位（__dirname 变成 C:\snapshot\desktop，
// 丢掉 packages 这一层），require('./runtime/...') 一律失败。
// 以上均在 build/_probe*.mjs 中用最小复现实测确认。
//
// 最终方案：esbuild 把 app.js 及其所有本地依赖压成【单个 CJS 文件】，
// pkg 只处理这一个文件，不涉及任何模块解析 → 与目录结构和构建机路径彻底解耦。
// runtime/、native/、icon.ico 由 Step 4 复制到 exe 旁边，运行时按 exe 目录读取。
const bundleEntry = path.join(ROOT, '.desktop.bundle.cjs');

{
  const esbuild = _require('esbuild');

  /**
   * esbuild 插件：修正 ewvjs 的内部资源路径。
   *
   * ewvjs 用 __dirname 推算两个资源位置：
   *   dllDir  = path.resolve(__dirname, '../../native')   → native/*.dll + WebView.cjs
   *   apiPath = path.resolve(__dirname, '../js/api.js')   → 注入页面的 API 脚本
   * 一旦被 esbuild 打进 bundle，__dirname 变成 bundle 所在目录，两个路径全部错位，
   * 运行时报 "Cannot find module '...\native\WebView.cjs'"（实测确认）。
   *
   * 这里在 esbuild 阶段直接把这些表达式替换成「按 exe 目录解析」的等价物：
   * 打包态取 process.execPath 的目录（native/ 由 Step 4 复制到 exe 旁边，
   * api.js 一并复制过去），开发态回退到源码目录。
   */
  const ewvjsPathFix = {
    name: 'ewvjs-path-fix',
    setup(build) {
      build.onLoad({ filter: /ewvjs[\\/]dist[\\/]platforms[\\/]windows\.js$/ }, (args) => {
        let src = fs.readFileSync(args.path, 'utf8');
        src = src
          // 原生 DLL 目录
          .replace(
            /dllDir = path\.resolve\(__dirname, '\.\.\/\.\.\/native'\);/g,
            `dllDir = (typeof process.pkg !== 'undefined' ? path.dirname(process.execPath) : path.resolve(__dirname, '../../native'));`
          )
          // 注入用的 api.js
          .replace(
            /apiPath = path\.resolve\(__dirname, '\.\.\/js\/api\.js'\);/g,
            `apiPath = (typeof process.pkg !== 'undefined' ? path.join(path.dirname(process.execPath), 'js', 'api.js') : path.resolve(__dirname, '../js/api.js'));`
          );
        return { contents: src, loader: 'js' };
      });
    },
  };

  // 注意：带 plugins 必须用异步 build()，buildSync 不支持插件
  await esbuild.build({
    entryPoints: [path.join(ROOT, 'app.js')],
    outfile: bundleEntry,
    bundle: true,
    platform: 'node',
    target: 'node22',
    format: 'cjs',
    charset: 'utf8',
    logLevel: 'warning',
    plugins: [ewvjsPathFix],
    // ewvjs 必须【一起打进 bundle】：
    // 它虽然是 ESM（type:module 且用 import/export），但 pkg 的快照里会按 CJS 加载，
    // 直接 require 会报 "module is not defined in ES module scope"（CI 实测）。
    // 打进 bundle 后由 esbuild 转成 CJS 即可。
    // 它运行时要的真实文件（native/*.dll、WebView.cjs、js/api.js）由 Step 4
    // 复制到 exe 同目录，上面插件负责让 ewvjs 去那里找。
    // koffi 是原生模块且用动态 require 加载，pkg 抓不到，保持 external（失败自动降级）。
    external: ['koffi'],
    // CJS 输出没有 import.meta，补一个等价 shim 供 createRequire 使用
    define: { 'import.meta.url': '__jm_import_meta_url' },
    banner: {
      js: [
        `const { pathToFileURL: __jm_p2u } = require('url');`,
        `const __jm_import_meta_url = __jm_p2u(__filename).href;`,
      ].join('\n'),
    },
  });
  console.log(`   ✓ App bundled: ${(fs.statSync(bundleEntry).size / 1024).toFixed(1)} KB`);
}

const pkgEntry = bundleEntry;

// pkg config
const nativePath = (() => {
  try {
    const p = _require.resolve('ewvjs');
    return path.join(path.dirname(path.dirname(p)), 'native');
  } catch { return null; }
})();

// assets 用【相对 bundle 所在目录】的 glob，pkg 会解析成快照内相对路径。
// 注意：快照外的绝对路径不能写进来（会污染快照映射）。
// runtime/ 实际由 Step 4 复制到 exe 旁边，运行时 app.js 按 exe 目录读取，
// 这里列出来只是为了兜底（安装包缺文件时不至于直接崩）。
const pkgConfig = {
  assets: ['./runtime/**/*'],
};
if (nativePath && fs.existsSync(nativePath)) {
  // ewvjs 原生 DLL 位于快照外，运行时需要真实文件，
  // 实际由 Step 4 复制到 dist/native。
  pkgConfig.assets.push(`${nativePath}/**/*`);
}

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
      pkgEntry,
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
  try { fs.unlinkSync(bundleEntry); } catch {}
}

console.log('   ✓ Executable created');

// ── Step 4: Copy assets ───────────────────────────────────────────
console.log('\n📁 Step 4: Copying assets...');
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
// ewvjs 注入页面的 API 脚本：被打进 bundle 后 ewvjs 会按 exe 目录的 js/api.js 读取，
// 因此必须随产物一起复制（见上面 esbuild 插件 ewvjsPathFix 的说明）。
{
  const apiSrc = nativePath ? path.join(path.dirname(nativePath), 'dist', 'js', 'api.js') : null;
  if (apiSrc && fs.existsSync(apiSrc)) {
    const apiDstDir = path.join(outputDir, 'js');
    fs.mkdirSync(apiDstDir, { recursive: true });
    fs.copyFileSync(apiSrc, path.join(apiDstDir, 'api.js'));
    console.log('   ✓ ewvjs api.js copied');
  } else {
    throw new Error(`未找到 ewvjs api.js（期望位置: ${apiSrc}）`);
  }
}

// ── Step 5: Patch subsystem to GUI (2) ─────────────────────────
console.log('\n🪟 Step 5: Patching subsystem to GUI...');
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

// ── Step 6: Create ZIP archive ────────────────────────────────────
console.log('\n📦 Step 6: Creating archive...');
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

// ── Step 7: 校验产物（图标 + VERSIONINFO + 子系统）───────────────
// 回归：1.0.2 曾出现 exe 图标仍是 Node 默认图标、版本信息显示 Node.js 的问题。
// 这里在打包流程内直接校验，避免"打包成功但产物错误"被漏过。
console.log('\n🔍 Step 7: Verifying artifacts...');
{
  const errors = [];
  const data = fs.readFileSync(outputExe);
  const exe = ResEdit.NtExecutable.from(data, {ignoreCert: true});
  const res = ResEdit.NtExecutableResource.from(exe);

  // 1) 图标：应有 icon group(14) 与对应 icon 资源(3)
  const iconGroups = res.entries.filter((e) => e.type === 14);
  const iconResources = res.entries.filter((e) => e.type === 3);
  if (iconGroups.length === 0) {
    errors.push('exe 缺少图标资源（RT_GROUP_ICON）');
  }
  if (iconResources.length === 0) {
    errors.push('exe 缺少图标位图（RT_ICON）');
  }

  // 2) VERSIONINFO：ProductName / FileVersion 必须是应用自身，不能是 Node.js
  const viList = ResEdit.Resource.VersionInfo.fromEntries(res.entries);
  if (viList.length === 0) {
    errors.push('exe 缺少 VERSIONINFO');
  } else {
    const vi = viList[0];
    const langs = vi.getAllLanguagesForStringValues();
    const lang = (langs && langs[0]) || vi.getDefaultVersionLang();
    const strings = vi.getStringValues(lang) || {};
    const product = strings.ProductName || '';
    const fileVer = strings.FileVersion || '';
    if (!product) errors.push('VERSIONINFO 缺少 ProductName');
    if (/node\.js/i.test(product)) errors.push(`ProductName 仍是 Node.js（实际: ${product}）`);
    if (!fileVer) errors.push('VERSIONINFO 缺少 FileVersion');
    if (fileVer && fileVer !== pack.version) {
      errors.push(`FileVersion(${fileVer}) 与 package.json(${pack.version}) 不一致`);
    }
  }

  // 3) 子系统应为 GUI(2)
  const peOffset = data.readUInt32LE(0x3C);
  const subsystem = data.readUInt16LE(peOffset + 24 + 68);
  if (subsystem !== 2) errors.push(`子系统应为 GUI(2)，实际 ${subsystem}`);

  // 4) 关键文件存在
  for (const rel of ['icon.ico', 'runtime/jm.core.all.cjs', 'native/WebView.cjs', 'js/api.js']) {
    if (!fs.existsSync(path.join(outputDir, rel))) errors.push(`缺少文件: ${rel}`);
  }
  if (!fs.existsSync(archivePath)) errors.push('缺少 zip 产物');

  // 5) 回归防线：exe 内不得残留「构建机绝对路径」。
  //    1.0.2 / 1.0.3 初版都因为 bootstrap 写死构建机路径，
  //    在本机能跑、换台机器就 ERR_MODULE_NOT_FOUND 启动即崩。
  //    exe 里一旦出现构建目录特征串，说明又有绝对路径被固化进快照。
  {
    const ascii = data.toString('latin1');
    const buildMarkers = [
      ROOT.replace(/\\/g, '/'),                      // C:/code/.../packages/desktop
      ROOT,                                          // C:\code\...\packages\desktop
      'pkg-bootstrap.cjs',                           // 旧的 CJS bootstrap 方案残留
    ];
    for (const m of buildMarkers) {
      if (m && ascii.includes(m)) {
        errors.push(`exe 内残留构建机路径特征 "${m}"（会在其他机器上启动即崩）`);
      }
    }
  }

  if (errors.length) {
    console.error('\n❌ 产物校验失败：');
    for (const e of errors) console.error('   - ' + e);
    process.exit(1);
  }
  console.log(`   ✓ 图标 / VERSIONINFO(v${pack.version}) / 子系统 / 关键文件 / 无构建机路径 全部通过`);
}

console.log('\n✅ Done:', outputExe);
