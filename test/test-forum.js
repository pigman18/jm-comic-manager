const path = require('path');
const fs = require('fs');
const axios = require('axios');
const crypto = require('crypto');
const FormData = require('form-data');

const ROOT = path.resolve(__dirname, '..');
const { JmMagicConstants, decodeRespData } = require(path.join(ROOT, 'packages/core/src/mobile'));

const cfgPath = path.join(process.env.APPDATA, 'JmComicManager', 'config.json');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));

const host = cfg.apiHosts[0];
const aid = '1444583';
const uid = cfg.memberInfo?.uid || '5303718';

function md5hex(key) {
  if (typeof key !== 'string') throw new Error('key must be string');
  return crypto.createHash('md5').update(key, 'utf-8').digest('hex');
}

function tokenAndTokenparam(ts, secret = JmMagicConstants.APP_TOKEN_SECRET, ver = JmMagicConstants.APP_VERSION) {
  const tokenparam = `${ts},${ver}`;
  const token = md5hex(`${ts}${secret}`);
  return { token, tokenparam };
}

async function testGetForum(label, url) {
  const ts = Math.floor(Date.now() / 1000);
  const { token, tokenparam } = tokenAndTokenparam(ts);
  console.log(`\n=== ${label} ===`);
  console.log('URL:', url);

  const res = await axios.get(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; LG-US998 Build/OPR1.170623.026; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36',
      'cookie': cfg.cookie || '',
      'Authorization': 'Bearer ' + (cfg.token || ''),
      'token': token,
      'tokenparam': tokenparam,
      'accept': 'application/json, text/plain, */*',
    },
    timeout: 15000,
  });

  const rawData = res.data;
  if (rawData && rawData.data && typeof rawData.data === 'string') {
    const decoded = decodeRespData(rawData.data, ts);
    console.log('Decoded:', JSON.stringify(decoded, null, 2).substring(0, 3000));
    return decoded;
  }
}

async function testPostComment(commentText, targetAid) {
  const ts = Math.floor(Date.now() / 1000);
  const { token, tokenparam } = tokenAndTokenparam(ts);
  const url = `${host}/comment`;
  console.log(`\n=== POST Comment ===`);
  console.log('URL:', url);
  console.log('Text:', commentText, 'AID:', targetAid);

  const fd = new FormData();
  fd.append('comment', commentText);
  fd.append('aid', String(targetAid));

  const res = await axios.post(url, fd, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Linux; Android 8.0.0; LG-US998 Build/OPR1.170623.026; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/131.0.6778.135 Mobile Safari/537.36',
      'cookie': cfg.cookie || '',
      'Authorization': 'Bearer ' + (cfg.token || ''),
      'token': token,
      'tokenparam': tokenparam,
      'accept': '*/*',
      ...fd.getHeaders(),
    },
    timeout: 15000,
  });

  const rawData = res.data;
  console.log('Status:', res.status);
  if (rawData && rawData.data && typeof rawData.data === 'string') {
    const decoded = decodeRespData(rawData.data, ts);
    console.log('Decoded:', JSON.stringify(decoded, null, 2));
  } else {
    console.log('Response:', JSON.stringify(rawData).substring(0, 1000));
  }
  return rawData;
}

(async () => {
  // 1. Get forum by aid
  const forumData = await testGetForum('Forum by aid', `${host}/forum?mode=all&page=1&aid=${aid}`);
  if (forumData) {
    console.log('\nTotal comments:', forumData.total || forumData.list?.length);
  }

  // 2. Get user's comment history
  await testGetForum('Forum by uid', `${host}/forum?uid=${uid}&page=1`);

  // 3. Post a comment (read-only test - print only, don't actually post)
  // await testPostComment('测试评论', aid);
  console.log('\n[SKIP] POST comment test is disabled to avoid spam');
})().catch(e => {
  console.error('ERROR:', e.message);
  if (e.response) console.error('Status:', e.response.status, 'Body:', typeof e.response.data === 'string' ? e.response.data.substring(0,500) : JSON.stringify(e.response.data).substring(0,500));
});
