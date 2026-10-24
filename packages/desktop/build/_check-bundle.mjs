// 排查：esbuild bundle 里是否含 import(pathToFileURL(
// 直接复用 package.js 的插件逻辑，避免手写差异
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');

const ewvjsPathFix = {
  name: 'ewvjs-path-fix',
  setup(build) {
    build.onLoad({ filter: /ewvjs[\\/]dist[\\/]platforms[\\/]windows\.js$/ }, (args) => {
      let src = fs.readFileSync(args.path, 'utf8');
      src = src
        .replace(
          /dllDir = path\.resolve\(__dirname, '\.\.\/\.\.\/native'\);/g,
          `dllDir = (typeof process.pkg !== 'undefined' ? path.dirname(process.execPath) : path.resolve(__dirname, '../../native'));`
        )
        .replace(
          /apiPath = path\.resolve\(__dirname, '\.\.\/js\/api\.js'\);/g,
          `apiPath = (typeof process.pkg !== 'undefined' ? path.join(path.dirname(process.execPath), 'js', 'api.js') : path.resolve(__dirname, '../js/api.js'));`
        );
      return { contents: src, loader: 'js' };
    });
  },
};

const out = path.join(ROOT, '.check-bundle.cjs');
await esbuild.build({
  entryPoints: [path.join(ROOT, 'app.js')],
  outfile: out,
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  charset: 'utf8',
  logLevel: 'error',
  plugins: [ewvjsPathFix],
  external: ['koffi'],
  define: { 'import.meta.url': '__jm_import_meta_url' },
  banner: {
    js: [
      `const { pathToFileURL: __jm_p2u } = require('url');`,
      `const __jm_import_meta_url = __jm_p2u(__filename).href;`,
    ].join('\n'),
  },
});

const s = fs.readFileSync(out, 'utf8');
const needle = 'import(pathToFileURL(';
console.log('bundle 大小:', (s.length / 1024).toFixed(1), 'KB');
console.log(`bundle 含 ${needle}:`, s.includes(needle));

let idx = s.indexOf(needle);
let count = 0;
while (idx >= 0 && count < 3) {
  console.log(`--- 命中 @${idx} ---`);
  console.log(JSON.stringify(s.substring(Math.max(0, idx - 250), idx + 250)));
  idx = s.indexOf(needle, idx + 1);
  count++;
}

fs.rmSync(out, { force: true });
