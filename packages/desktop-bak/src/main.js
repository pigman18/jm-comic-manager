'use strict';

const path = require('path');
const fs = require('fs');
const os = require('os');
const { spawn, exec } = require('child_process');
const { createTray, showConfirm } = require('./tray');

let bundle;
try {
  bundle = require('../runtime/jm.core.all.js');
} catch (e) {
  process.exit(1);
}

const PKG_DIR = path.resolve(__dirname, '..');
const REPO_ROOT = path.resolve(PKG_DIR, '..', '..');

function appDataDir() {
  const app = 'JmComicManager';
  if (process.platform === 'win32')
    return path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), app);
  return path.join(os.homedir(), '.config', app);
}
function configPath() { return path.join(appDataDir(), 'config.json'); }
function hasConfig() { return fs.existsSync(configPath()); }
function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf-8')); } catch { return {}; }
}
function writeConfig(cfg) {
  const cur = readConfig();
  for (const [k, v] of Object.entries(cfg)) {
    if (v === undefined || v === null) delete cur[k];
    else cur[k] = v;
  }
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(cur, null, 2));
}


function browseDir(defaultPath) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') { resolve(''); return; }
    const sel = defaultPath ? `$f.SelectedPath = '${defaultPath.replace(/'/g, "''")}'; ` : '';
    exec(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.FolderBrowserDialog; ${sel}$f.ShowDialog() | Out-Null; Write-Output $f.SelectedPath"`,
      { windowsHide: true, timeout: 30000 }, (err, stdout) => resolve((stdout || '').trim()));
  });
}
function browseFile(defaultPath) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') { resolve(''); return; }
    let init = '';
    if (defaultPath) {
      try {
        const dir = path.dirname(defaultPath);
        const base = path.basename(defaultPath);
        init = `$f.InitialDirectory = '${dir.replace(/'/g, "''")}'; $f.FileName = '${base.replace(/'/g, "''")}'; `;
      } catch {}
    }
    exec(`powershell -NoProfile -Command "Add-Type -AssemblyName System.Windows.Forms; $f = New-Object System.Windows.Forms.OpenFileDialog; ${init}$f.ShowDialog() | Out-Null; Write-Output $f.FileName"`,
      { windowsHide: true, timeout: 30000 }, (err, stdout) => resolve((stdout || '').trim()));
  });
}

function restartApp() {
  const child = spawn(process.execPath, process.argv.slice(1), {
    detached: true, stdio: 'inherit', windowsHide: true,
  });
  child.unref();
  process.exit(0);
}

// --- Main ---
async function main() {
  const { create_window, expose, start } = require('ewvjs');
  const iconIco = path.join(REPO_ROOT, 'resources', 'icon.ico');
  const configHtml = path.join(PKG_DIR, 'src', 'config-window.html');

  // State
  let mainWin = null;
  let mainWinAlive = false;
  let trayRef = null;
  let _configSavedCb = null;

  // Helpers
  async function createMainWindow(homeUrl) {
    const mw = await create_window('JM\u6F2B\u753B\u7BA1\u7406\u5668', homeUrl, {
      width: 1200, height: 800, min_width: 800, min_height: 600, icon: iconIco, confirm_close: true,
    });
    
    await mw.run();
    // Inject desktop top bar
    try {
      await mw.evaluate(`(function(){
  function i(){
    if(document.getElementById('jm-desktop-bar'))return;
    var bar=document.createElement('div');
    bar.id='jm-desktop-bar';
    var arrow=document.createElement('span');
    arrow.id='jm-bar-arrow';
    bar.appendChild(arrow);
    var list=[
      {i:'\\u2699',t:'\\u8BBE\\u7F6E',c:'openSettings'},
      {i:'\\uD83D\\uDCCB',t:'\\u6253\\u5F00\\u914D\\u7F6E\\u6587\\u4EF6\\u5939',c:'openConfigDir'},
      {i:'\\uD83D\\uDCC1',t:'\\u6253\\u5F00\\u6570\\u636E\\u76EE\\u5F55',c:'openDataDir'},
      {i:'\\uD83C\\uDF10',t:'\\u5728\\u6D4F\\u89C8\\u5668\\u4E2D\\u6253\\u5F00',c:'openBrowser'},
      {i:'\\uD83D\\uDD04',t:'\\u5237\\u65B0',c:'refreshPage'},
      {i:'\\u2B07',t:'\\u9690\\u85CF\\u5230\\u6258\\u76D8',c:'hideToTray'}
    ];
    list.forEach(function(a){
      var btn=document.createElement('button');
      btn.className='jm-desktop-bar-btn';
      btn.title=a.t;
      btn.textContent=a.i;
      btn.onclick=function(){window.ewvjs.api[a.c]();};
      bar.appendChild(btn);
    });
    var s=document.createElement('style');
    s.textContent='#jm-desktop-bar{position:fixed;top:0;left:50%;transform:translateX(-50%);display:flex;flex-direction:row;align-items:center;justify-content:center;gap:4px;padding:0 10px;background:rgba(24,24,28,0.85);border:1px solid rgba(255,255,255,0.08);border-top:none;border-radius:0 0 8px 8px;z-index:9999;height:16px;overflow:hidden;transition:height 0.2s ease,padding-top 0.2s ease,padding-bottom 0.2s ease;}'+
      '#jm-desktop-bar:hover{height:44px;padding-top:6px;padding-bottom:6px;}'+
      '#jm-bar-arrow{position:absolute;top:0;left:50%;margin-left:-6px;width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:6px solid rgba(255,255,255,0.35);pointer-events:none;}'+
      '#jm-desktop-bar:hover #jm-bar-arrow{display:none;}'+
      '#jm-desktop-bar:not(:hover) .jm-desktop-bar-btn{visibility:hidden;}'+
      '.jm-desktop-bar-btn{width:32px;height:32px;border:none;border-radius:5px;background:rgba(255,255,255,0.08);color:rgba(255,255,255,0.85);font-size:16px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0;flex-shrink:0;transition:background 0.15s;}'+
      '.jm-desktop-bar-btn:hover{background:rgba(255,255,255,0.18);}'+
      '.jm-desktop-bar-btn:active{background:rgba(255,255,255,0.3);}';
    document.head.appendChild(s);
    document.body.appendChild(bar);
  }
  if(document.body)i();else document.addEventListener('DOMContentLoaded',i);
})();`);
    } catch (e) {
      console.error('[desktop] top bar injection failed:', e.message);
    }
    mainWin = mw;
    mainWinAlive = true;
    mw.on_close = () => {
      mainWinAlive = false;
      if (trayRef) trayRef.setMenu(getTrayMenu());
    };
    mw.on_context_menu = (params) => {
      return [
        { label: '设置', click: () => mw.evaluate('window.ewvjs.api.openSettings()').catch(() => {}) },
        { label: '打开配置文件夹', click: () => mw.evaluate('window.ewvjs.api.openConfigDir()').catch(() => {}) },
        { label: '打开数据目录', click: () => mw.evaluate('window.ewvjs.api.openDataDir()').catch(() => {}) },
        { label: '在浏览器中打开', click: () => mw.evaluate('window.ewvjs.api.openBrowser()').catch(() => {}) },
        { type: 'separator' },
        { label: '刷新', click: () => mw.reload() },
        { type: 'separator' },
        { label: '隐藏到托盘', click: () => { mw.hide().catch(() => {}); mainWinAlive = false; if (trayRef) trayRef.setMenu(getTrayMenu()); } },
        { type: 'separator' },
        { label: '退出', click: () => { if (trayRef) trayRef.close(); bundle.stop().catch(() => {}); process.exit(0); } },
      ];
    };
    return mw;
  }

  function getTrayMenu() { return [
    { id: 'toggle', title: mainWinAlive ? '隐藏到托盘' : '显示主窗口' },
    { separator: true },
    { id: 'quit', title: '退出' },
  ]; }

  function setupTray(mw) {
    const tr = createTray({
      icon: iconIco,
      tooltip: 'JM\u6F2B\u753B\u7BA1\u7406\u5668',
      menu: getTrayMenu(),
      onClicked: async (id) => {
        if (id === 'toggle') {
          if (mainWinAlive) { await mw.hide(); mainWinAlive = false; tr.setMenu(getTrayMenu()); }
          else { await mw.show(); mw.focus(); mainWinAlive = true; tr.setMenu(getTrayMenu()); }
        } else if (id === 'quit') {
          tr.close();
          if (mw) await mw.close();
          await bundle.stop();
          process.exit(0);
        }
      },
      onExit: () => { trayRef = null; },
    });
    trayRef = tr;
    process.on('exit', () => { if (tr) tr.close(); });
    process.on('SIGTERM', () => { if (tr) tr.close(); process.exit(0); });
    process.on('SIGINT', () => { if (tr) tr.close(); process.exit(0); });
  }

  // Expose shared functions (with placeholder, overridden per-mode)
  expose('loadConfig', () => ({}));
  expose('saveConfig', (cfg) => { writeConfig(cfg); return { ok: true }; });
  expose('browseDir', browseDir);
  expose('browseFile', browseFile);
  expose('configSaved', () => { if (typeof _configSavedCb === 'function') _configSavedCb(); });
  expose('configExited', () => {});

  function exposeSidebarFns() {
    expose('refreshPage', () => {
      if (mainWin) mainWin.reload();
    });
    expose('hideToTray', async () => {
      if (!mainWin) return;
      await mainWin.hide();
      mainWinAlive = false;
      if (trayRef) trayRef.setMenu(getTrayMenu());
    });
    expose('openDataDir', () => {
      const cfg = readConfig();
      const dir = cfg.dataDir || appDataDir();
      if (process.platform === 'win32') exec(`explorer "${dir}"`);
    });
    expose('openConfigDir', () => {
      if (process.platform === 'win32') exec(`explorer "${appDataDir()}"`);
    });
    expose('openBrowser', () => {
      const url = bundle.state.server.homeUrl;
      if (process.platform === 'win32') exec(`start "" "${url}"`);
    });
    expose('openSettings', async () => {
      if (!mainWin) return;
      // Read config-window.html and inject as modal dialog
      const html = fs.readFileSync(configHtml, 'utf-8');
      const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/i);
      const styleContent = styleMatch ? styleMatch[1] : '';
      const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
      const bodyContent = bodyMatch ? bodyMatch[1] : html;
      const scriptMatch = bodyContent.match(/<script>([\s\S]*)<\/script>/i);
      const scriptContent = scriptMatch ? scriptMatch[1] : '';
      const noScript = bodyContent.replace(/<script>[\s\S]*<\/script>/, '');
      const escContent = JSON.stringify('<style>' + styleContent + '</style>' + noScript);
      const escScript = JSON.stringify(scriptContent);
      await mainWin.evaluate(`(function(){
  if(document.getElementById('jm-settings-overlay'))return;
  function closeSettings(){o.remove();window.ewvjs.api.configExited();document.removeEventListener('keydown',escHandler);}
  function escHandler(e){if(e.key==='Escape')closeSettings();}
  var o=document.createElement('div');
  o.id='jm-settings-overlay';
  o.style.cssText='position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.45);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);';
  var d=document.createElement('div');
  d.style.cssText='background:#1e1e22;border-radius:12px;border:1px solid rgba(46,46,53,.95);width:620px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 20px 60px rgba(0,0,0,0.5);';
  d.innerHTML=${escContent};
  o.appendChild(d);
  document.body.appendChild(o);
  var s=document.createElement('script');
  s.textContent=${escScript};
  document.body.appendChild(s);
  document.addEventListener('keydown',escHandler);
  window.save=async function(){
    var u=document.getElementById('username').value.trim();
    var p=document.getElementById('password').value;
    if(!u||!p){alert('\\u7528\\u6237\\u540D\\u548C\\u5BC6\\u7801\\u4E3A\\u5FC5\\u586B\\u9879');return;}
    var cfg={username:u,password:p,
      dataDir:document.getElementById('dataDir').value.trim()||undefined,
      port:Number(document.getElementById('port').value)||47310,
      comicViewer:document.getElementById('comicViewer').value.trim()||undefined,
      timeout:Number(document.getElementById('timeout').value)||86400000,
      debug:document.getElementById('debug').checked,
      host:document.getElementById('host').value.trim()||undefined,
      cdnHosts:splitLines(document.getElementById('cdnHosts').value),
      apiHosts:splitLines(document.getElementById('apiHosts').value)};
    if(cfg.cdnHosts.length===0)delete cfg.cdnHosts;
    if(cfg.apiHosts.length===0)delete cfg.apiHosts;
    for(var k of Object.keys(cfg)){if(cfg[k]==='')cfg[k]=undefined;}
    var r=await window.ewvjs.api.saveConfig(cfg);
    if(r&&r.ok){closeSettings();}
    else{alert(r?.message||'\\u4FDD\\u5B58\\u5931\\u8D25');}
  };
  window.quit=closeSettings;
  o.addEventListener('click',function(e){if(e.target===o)closeSettings();});
})();`);
    });
  }

  if (!hasConfig()) {
    // ====== FIRST RUN: only config window, server starts after save ======
    console.log('[desktop] first-run config');
    // loadConfig returns empty (no file yet)
    expose('loadConfig', () => ({}));

    const cw = await create_window('JM\u6F2B\u753B\u7BA1\u7406\u5668 - \u521D\u59CB\u914D\u7F6E', configHtml, {
      width: 640, height: 560, resizable: false, icon: iconIco,
    });
    await cw.run();

    let _done = false;
    _configSavedCb = async () => {
      if (_done) return;
      _done = true;
      await cw.close();
      await bundle.start({}, {});
      console.log('[desktop] server:', bundle.state.server.homeUrl);
      exposeSidebarFns();
      await createMainWindow(bundle.state.server.homeUrl);
      setupTray(mainWin);
    };
    expose('configExited', async () => {
      await cw.close();
      process.exit(0);
    });

    await cw.show();
    await start();

  } else {
    // ====== NORMAL: server first, then window + tray ======
    await bundle.start({}, {});
    console.log('[desktop] server:', bundle.state.server.homeUrl);
    expose('loadConfig', () => readConfig());
    exposeSidebarFns();
    await createMainWindow(bundle.state.server.homeUrl);
    setupTray(mainWin);
    await start();
  }
}

main().catch((e) => { console.error('[desktop]', e); process.exit(1); });
