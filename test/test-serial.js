const path = require('path');
const crypto = require('crypto');

const cfgPath = path.join(process.env.APPDATA, 'JmComicManager', 'config.json');
const cfg = JSON.parse(require('fs').readFileSync(cfgPath, 'utf-8'));
const ROOT = path.resolve(__dirname, '..');
const { decodeRespData } = require(path.join(ROOT, 'packages/core/src/mobile.js'));

function md5hex(key) {
  return crypto.createHash('md5').update(key, 'utf-8').digest('hex');
}
const APP_TOKEN_SECRET = '185Hcomic3PAPP7R';
const APP_VERSION = '3.0.1';

async function test(page) {
  const ts = Math.floor(Date.now() / 1000);
  const host = cfg.apiHosts[0].replace(/\/+$/, '');
  const url = host + '/serialization?type=all&date=5&page=' + page;
  console.log('Fetching page ' + page + ':', url);

  const res = await fetch(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; LG-US998 Build/OPR1.170623.026; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36',
      'Authorization': 'Bearer ' + (cfg.token || ''),
      'token': md5hex(String(ts) + APP_TOKEN_SECRET),
      'tokenparam': ts + ',' + APP_VERSION,
      'accept': 'application/json, text/plain, */*',
    }
  });
  const json = await res.json();
  console.log('Status:', res.status, 'code:', json.code);

  if (json.code === 200 && json.data) {
    let decoded;
    if (typeof json.data === 'string') {
      decoded = decodeRespData(json.data, ts);
    } else {
      decoded = json.data;
    }
    console.log('Decoded type:', typeof decoded, Array.isArray(decoded) ? 'array[' + decoded.length + ']' : '');
    if (Array.isArray(decoded)) {
      if (decoded.length === 0) {
        console.log('Empty array - no more data');
        return 'END';
      }
      const first = decoded[0];
      if (first && first.error) {
        console.log('Error item:', JSON.stringify(first));
        return 'END';
      }
      console.log('First item keys:', Object.keys(first));
      console.log('First item (abbreviated):', JSON.stringify(first).substring(0, 400));
      return decoded;
    } else {
      console.log('Not an array:', JSON.stringify(decoded).substring(0, 500));
    }
  }
  return null;
}

(async () => {
  for (let p = 1; p <= 5; p++) {
    const result = await test(p);
    console.log('');
    if (result === 'END') {
      console.log('Reached end at page ' + p);
      break;
    }
  }
})();
