'use strict';

const axios = require('axios');
const fs = require('node:fs');
const path = require('node:path');
const {mkdirSyncIfNotExists} = require('./file');
const { logStart, logDone, logError, logProgress, logDoneProgress } = require('./log');

let rpcId = 1;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function headersToAria2Lines(h) {
  if (!h) return [];
  if (Array.isArray(h)) return h;
  const out = [];
  for (const k of Object.keys(h)) {
    const v = h[k];
    if (v == null || v === '') continue;
    out.push(`${k}: ${v}`);
  }
  return out;
}

function resolveSourceUrl(response, aria2) {
  if (aria2.sourceUrl) return aria2.sourceUrl;
  const res = response && response.request && response.request.res;
  if (res && res.responseUrl) return res.responseUrl;
  return response.config && response.config.url;
}

function normalizeRpcUrl(raw) {
  let u = String(raw || '').trim();
  if (!u) return '';
  u = u.replace(/\/?$/, '');
  if (/\/jsonrpc$/i.test(u)) return u;
  return `${u}/jsonrpc`;
}

function rpcCall(rpcUrl, method, params, opts) {
  const url = normalizeRpcUrl(rpcUrl);
  if (!url) return Promise.reject(new Error('aria2 rpcUrl 为空'));
  const id = String(rpcId++);
  const timeout = opts && opts.timeout != null ? opts.timeout : 0;
  return axios
      .post(
          url,
          { jsonrpc: '2.0', id, method, params },
          {
            headers: { 'Content-Type': 'application/json' },
            timeout,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
          },
      )
      .then((r) => {
        const err = r.data && r.data.error;
        if (err) throw new Error(err.message || String(err.code || 'aria2 rpc error'));
        return r.data && r.data.result;
      });
}

/**
 * aria2 JSON-RPC 是否可用（aria2.getVersion）
 * @param {{ rpcUrl: string, secret?: string }} aria2
 * @return {Promise<boolean>}
 */
async function checkAria2(aria2) {
  if (!aria2 || !normalizeRpcUrl(aria2.rpcUrl)) return false;
  const hasSecret = aria2.secret != null && String(aria2.secret).trim() !== '';
  const params = hasSecret ? [`token:${aria2.secret}`] : [];
  try {
    await rpcCall(aria2.rpcUrl, 'aria2.getVersion', params, { timeout: 8000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * 丢弃 axios 流，改由 aria2 拉取 sourceUrl 写入 bakDataPath，再 rename 到 dataPath。
 * aria2: { rpcUrl, secret?, sourceUrl?, headers? }
 */
async function saveAria2Response(response, dataPath, bakDataPath, onProgress, aria2) {
  const stream = response && response.data;
  if (stream && stream.destroy) stream.destroy();
  else if (stream && stream.resume) stream.resume();

  const sourceUrl = resolveSourceUrl(response, aria2);
  const dir = path.dirname(bakDataPath);
  const out = path.basename(bakDataPath);
    mkdirSyncIfNotExists(dir);

  const header = headersToAria2Lines(aria2.headers);
  const opt = { dir, out };
  if (header.length) opt.header = header;

  const uris = [sourceUrl];
  const hasSecret = aria2.secret != null && String(aria2.secret).trim() !== '';
  const params = hasSecret ? [`token:${aria2.secret}`, uris, opt] : [uris, opt];

  const rpc = normalizeRpcUrl(aria2.rpcUrl);
  const fileName = path.basename(dataPath);
  logStart(`${fileName} 下载(aria2)`);
  let gid;
  try {
    gid = await this.rpcCall(rpc, 'aria2.addUri', params);
    const poll = hasSecret ? [`token:${aria2.secret}`, gid] : [gid];
    for (;;) {
      await sleep(400);
      const st = await this.rpcCall(rpc, 'aria2.tellStatus', poll);
      const complete = parseInt(st.completedLength, 10) || 0;
      const total = parseInt(st.totalLength, 10) || 0;
      logProgress(`${fileName} 下载(aria2)`, complete, total > 0 ? String(total) : '');
      if (onProgress) onProgress({ complete, total });
      const status = st.status;
      if (status === 'complete') break;
      if (status === 'error' || status === 'removed') throw new Error(st.errorMessage || status);
    }
    fs.renameSync(bakDataPath, dataPath);
    logDoneProgress(`${fileName} 下载(aria2)`);
    if (onProgress) {
      const st = require('node:fs').statSync(dataPath);
      onProgress({ complete: st.size, total: st.size });
    }
    logDone(`${fileName} 下载(aria2)`);
  } catch (e) {
    logError(`${fileName} 下载(aria2)`, e);
    fs.rmSync(bakDataPath);
    throw e;
  }
}

module.exports = {
  checkAria2,
  saveAria2Response
};
