import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const cfgPath = path.join(process.env.APPDATA, 'JmComicManager', 'config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));

const ROOT = path.resolve(new URL('.', import.meta.url).pathname, '..');
const { decodeRespData } = await import(path.join(ROOT, 'packages/core/src/mobile.js'));

function md5hex(key) {
  return crypto.createHash('md5').update(key, 'utf-8').digest('hex');
}

const APP_TOKEN_SECRET = '185Hcomic3PAPP7R';
const APP_VERSION = '3.0.1';

async function testPromote(host, label) {
  const ts = Math.floor(Date.now() / 1000);
  const tokenparam = ts + ',' + APP_VERSION;
  const token = md5hex(String(ts) + APP_TOKEN_SECRET);

  console.log('\n=== ' + label + ' ===');
  const url = host + '/promote';
  console.log('URL:', url);

  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; LG-US998 Build/OPR1.170623.026; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36',
      'Authorization': 'Bearer ' + (cfg.token || ''),
      'token': token,
      'tokenparam': tokenparam,
      'cookie': cfg.cookie || '',
      'accept': 'application/json, text/plain, */*',
    }
  });
  const json = await res.json();
  console.log('Status:', res.status, 'code:', json.code);

  if (json.code === 200 && json.data) {
    const decoded = decodeRespData(json.data, ts);
    console.log('\nDecoded data:');
    console.log(JSON.stringify(decoded, null, 2).substring(0, 4000));
  }
}

(async () => {
  for (const h of cfg.apiHosts) {
    await testPromote(h.replace(/\/+$/, ''), h);
  }
})();
