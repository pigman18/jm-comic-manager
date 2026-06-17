'use strict'

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const CHANGE = 'handleChangeConfig';

function appDataDir() {
    const app = 'jm-comic-manager';
    switch (process.platform) {
        case 'win32': return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), app);
        case 'darwin': return path.join(os.homedir(), 'Library', 'Application Support', app);
        default: return path.join(os.homedir(), '.config', app);
    }
}

let defaultConfig = {
    "username": "",
    "password": "",
    "dataDir": path.join(appDataDir(), 'data'),
    "port": 47310,
    "comicViewer": 'linux' === process.platform ? "" : "C:\\Program Files\\ComicRack\\ComicRack.exe",
    "timeout": 86400000,
    "host": "https://18comic.vip",
    "cdnHosts": [
        "https://cdn-msp.18comic.vip",
        "https://cdn-msp2.18comic.vip",
        "https://cdn-msp3.18comic.vip"
    ],
    "apiHosts": [
        "https://www.cdnhjk.net",
        "https://www.cdngwc.cc",
        "https://www.cdngwc.net",
        "https://www.cdngwc.club"
    ],
    "headless": false,
    "token": "",
    "cookie": ""
};

/**
 * JM 模块用户配置（磁盘上的 config.json）
 * manifest.json 为模块应用配置（随包发布）；config.json 为用户配置
 * @param manifest {object}         JM 模块应用配置
 * @param ctx      {*|null}         上下文对象
 * @return {{get: function(): object, setValue: function(string, *): void, trigger: function(object): void}}
 */
function createConfig(manifest, ctx) {
  let configFile = path.join(appDataDir(), 'config.json');

  if (typeof ctx?.event?.on === 'function') {
    ctx.event.on(CHANGE, trigger);
  }

  function get() {
    let config = {};
      if (!fs.existsSync(configFile)) {
          config = defaultConfig;
          try { fs.mkdirSync(path.dirname(configFile), { recursive: true }); } catch {}
          fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
          return { ...config };
      }
    return JSON.parse(fs.readFileSync(configFile, 'UTF-8'));
  }

  let _config = get();
  const out = { ..._config };

  function trigger(bundle) {
    if (!bundle || bundle.id !== manifest.id) return;
    _config = get();
    for (const k of Object.keys(out)) {
      if (k === 'get' || k === 'setValue' || k === 'trigger' || k === 'close') continue;
      delete out[k];
    }
    Object.assign(out, _config);
  }

  function setValue(key, value) {
    _config[key] = value;
    out[key] = value;
    fs.writeFileSync(configFile, JSON.stringify(_config, null, 2));
  }

  function close() {
    if (typeof ctx?.event?.off === 'function') {
      ctx.event.off(CHANGE, trigger);
    }
  }

  out.get = get;
  out.setValue = setValue;
  out.trigger = trigger;
  out.close = close;
  return out;
}

module.exports = {
  createConfig,
};
