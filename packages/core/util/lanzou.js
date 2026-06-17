// util/lanzou.js
const fs = require('node:fs');
const path = require('node:path');
const axios = require('axios');
const { CookieJar } = require('tough-cookie');
const { connect } = require('puppeteer-real-browser');

/* ========== 常量 ========== */
const HOST_PC = 'https://pc.woozooo.com';
const HOST_SHARE = 'https://wwatw.lanzn.com';
const API_UPLOAD = `${HOST_PC}/doupload.php`;
const API_HTML5 = `${HOST_PC}/html5up.php`;

/* ========== axios 重试包装器 ========== */
function withRetry(fn, retries = 3, delay = 1000) {
  return async (...args) => {
    let lastError;

    for (let i = 0; i <= retries; i++) {
      try {
        return await fn(...args);
      } catch (err) {
        lastError = err;

        const shouldRetry =
          err.response?.status === 502 ||
          err.response?.status === 504 ||
          err.code === 'ECONNABORTED' ||
          err.code === 'ECONNRESET';

        if (!shouldRetry || i === retries) {
          throw err;
        }

        await new Promise(r => setTimeout(r, delay * (i + 1)));
      }
    }

    throw lastError;
  };
}

class LanZou {
  constructor({ username, password, cookie, proxy, mockChunkSize }) {
    this.username = username;
    this.password = password;
    this.manualCookie = cookie || '';
    this.proxy = proxy || null;
    this.mockChunkSize = mockChunkSize || 500;
    this.loggedIn = false;

    this.jar = new CookieJar();

    this.client = axios.create({
      withCredentials: true,
      proxy: proxy
        ? { host: proxy.split(':')[0], port: Number(proxy.split(':')[1]) }
        : false,
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
        'X-Requested-With': 'XMLHttpRequest',
      },
    });

    this._setupInterceptors();
  }

  /* ========== 拦截器 ========== */
  _setupInterceptors() {
    this.client.interceptors.request.use(async (config) => {
      const cookie = await this.jar.getCookieString(config.url);
      if (cookie) config.headers['Cookie'] = cookie;
      return config;
    });

    this.client.interceptors.response.use(async (res) => {
      const setCookie = res.headers['set-cookie'];
      if (setCookie) {
        for (const c of setCookie) {
          await this.jar.setCookie(c, res.config.url);
        }
      }
      return res;
    });

    this.client.get = withRetry(this.client.get.bind(this.client));
    this.client.post = withRetry(this.client.post.bind(this.client));
  }

  /* ========== Cookie ========== */
  async injectManualCookie() {
    if (!this.manualCookie) return;
    const list = this.manualCookie.split(';').map(v => v.trim()).filter(Boolean);
    for (const c of list) {
      await this.jar.setCookie(c, HOST_PC);
      await this.jar.setCookie(c, HOST_SHARE);
    }
    this.loggedIn = true;
  }

  /* ========== 登录（懒加载 + 重试一次） ========== */
  async login() {
    if (this.loggedIn) return;

    if (this.manualCookie) {
      await this.injectManualCookie();
      return;
    }

    console.log('[LanZou] login start');

    const res1 = await this.client.get(
      'https://accounts.woozooo.com/accounts.php?action=login&ref=pc.woozooo.com'
    );
    await this._patchAcwScV2(res1.data);
    await this.client.get(
      'https://accounts.woozooo.com/accounts.php?action=login&ref=pc.woozooo.com'
    );

    const params = new URLSearchParams();
    params.append('task', 'uselogin');
    params.append('username', this.username);
    params.append('password', this.password);
    params.append('ref', 'pc.woozooo.com');

    const res2 = await this.client.post(
      'https://accounts.woozooo.com/accounts.php',
      params.toString()
    );

    if (res2.data?.msgs) {
      await this.client.get(res2.data.msgs);
    }

    this.loggedIn = true;
    console.log('[LanZou] login success');
  }

  /* ========== JS Cookie Patch ========== */
  async _patchAcwScV2(html) {
    const script = html
      .split('<html><script>')[1]
      ?.split('</script></html>')[0];
    if (!script) return;

    const originFn = Function.prototype.constructor;
    Function.prototype.constructor = function (...args) {
      if (/debugger/.test(args[0])) return () => {};
      return originFn(...args);
    };

    const document = { cookie: '', location: { reload() {} } };
    eval(`(function(){${script}})()`);

    if (document.cookie) {
      await this.jar.setCookie(
        document.cookie,
        'https://accounts.woozooo.com'
      );
    }
  }

  /* ========== 目录 ========== */
  async getFolderId(dir, retry = true) {
    try {
      if (!dir || dir === '/' || dir === '') return '-1';

      const parts = dir.split('/').filter(Boolean);
      let parentId = '-1';

      for (const name of parts) {
        const params = new URLSearchParams();
        params.append('task', '47');
        params.append('folder_id', parentId);

        const res = await this.client.post(API_UPLOAD, params.toString(), {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
        });

        const folder = (res.data?.text || []).find(f => f.name === name);
        if (!folder) throw new Error(`folder not found: ${dir}`);
        parentId = folder.fol_id;
      }
      return parentId;
    } catch (e) {
      if (retry) {
        this.loggedIn = false;
        await this.login();
        return this.getFolderId(dir, false);
      }
      throw e;
    }
  }

  /* ========== 上传文件 ========== */
  async uploadFile(
    localPath,
    dir = '',
    { retry = true, onProgress = () => {} } = {}
  ) {
    const startTime = Date.now();
    const stat = fs.statSync(localPath);
    const total = stat.size;

    try {
      const folderId = await this.getFolderId(dir);
      const name = path.basename(localPath);
      const ext = path.extname(name).toLowerCase();

      const mimeMap = {
        '.zip': 'application/x-zip-compressed',
        '.rar': 'application/x-rar-compressed',
        '.7z': 'application/x-7z-compressed',
        '.exe': 'application/octet-stream',
        '.mp4': 'video/mp4',
        '.jpg': 'image/jpeg',
        '.png': 'image/png',
      };

      const contentType = mimeMap[ext] || 'application/octet-stream';
      const boundary = '----WebKitFormBoundary' + Date.now();
      const parts = [];

      const append = (str) => parts.push(Buffer.from(str));

      append(`--${boundary}\r\n`);
      append('Content-Disposition: form-data; name="task"\r\n\r\n1\r\n');

      append(`--${boundary}\r\n`);
      append('Content-Disposition: form-data; name="vie"\r\n\r\n2\r\n');

      append(`--${boundary}\r\n`);
      append('Content-Disposition: form-data; name="ve"\r\n\r\n2\r\n');

      append(`--${boundary}\r\n`);
      append(`Content-Disposition: form-data; name="id"\r\n\r\nWU_FILE_0\r\n`);

      append(`--${boundary}\r\n`);
      append(`Content-Disposition: form-data; name="name"\r\n\r\n${name}\r\n`);

      append(`--${boundary}\r\n`);
      append(`Content-Disposition: form-data; name="type"\r\n\r\n${contentType}\r\n`);

      append(`--${boundary}\r\n`);
      append(`Content-Disposition: form-data; name="lastModifiedDate"\r\n\r\n${new Date().toUTCString()}\r\n`);

      append(`--${boundary}\r\n`);
      append(`Content-Disposition: form-data; name="size"\r\n\r\n${total}\r\n`);

      append(`--${boundary}\r\n`);
      append(`Content-Disposition: form-data; name="folder_id_bb_n"\r\n\r\n${folderId}\r\n`);

      append(`--${boundary}\r\n`);
      append(`Content-Disposition: form-data; name="upload_file"; filename="${name}"\r\n`);
      append(`Content-Type: ${contentType}\r\n\r\n`);

      parts.push(fs.readFileSync(localPath));
      parts.push(Buffer.from('\r\n'));

      append(`--${boundary}--\r\n`);

      /* ========= 模拟进度 ========= */

      if (!this.mockChunkSize || this.mockChunkSize <= 0) {
        this.mockChunkSize = 256 * 1024; // 初始 256KB
      }

      let sent = 0;
      let stopped = false;

      const timer = setInterval(() => {
        if (stopped) return;

        sent += this.mockChunkSize;
        if (sent > total * 0.95) sent = total * 0.95;

        onProgress(Math.floor(sent), total);
      }, 30);

      /* ========= 真实上传 ========= */

      await this.client.post(API_HTML5, Buffer.concat(parts), {
        headers: {
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Referer': `${HOST_PC}/mydisk.php?item=files&action=index`,
        },
      });

      /* ========= 校准 mockChunkSize ========= */

      stopped = true;
      clearInterval(timer);

      const costMs = Date.now() - startTime;
      const realChunkSize = total / (costMs / 30);

      this.mockChunkSize = Math.floor(
        (this.mockChunkSize + realChunkSize) / 2
      );

      // 最后 5% 假处理
      for (let i = 95; i <= 100; i++) {
        onProgress(Math.floor(total * i / 100), total);
        await new Promise(r => setTimeout(r, 60));
      }

      console.log('[LanZou] upload success:', name);
      return true;
    } catch (e) {
      if (retry) {
        this.loggedIn = false;
        await this.login();
        return this.uploadFile(localPath, dir, {
          retry: false,
          onProgress,
        });
      }
      throw e;
    }
  }

  /* ========== 文件列表 ========== */
  async listFiles(dir, retry = true) {
    try {
      const folderId = await this.getFolderId(dir);

      const params = new URLSearchParams();
      params.append('task', '5');
      params.append('folder_id', folderId);
      params.append('pg', '1');

      const res = await this.client.post(API_UPLOAD, params.toString(), {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8' },
      });

      return (res.data?.text || []).map(f => ({
        fileId: f.id,
        name: f.name_all || f.name,
        size: f.size,
        path: path.posix.join(dir, f.name_all || f.name),
      }));
    } catch (e) {
      if (retry) {
        this.loggedIn = false;
        await this.login();
        return this.listFiles(dir, false);
      }
      throw e;
    }
  }

  /* ========== 判断文件是否存在 ========== */
  async existsFile(file, retry = true) {
    try {
      const dir = path.posix.dirname(file);
      const name = path.posix.basename(file);
      const files = await this.listFiles(dir, false);
      return files.some(f => f.name === name);
    } catch (e) {
      if (retry) {
        this.loggedIn = false;
        await this.login();
        return this.existsFile(file, false);
      }
      return false;
    }
  }

  /* ========== 生成文件分享短链 ========== */
  async getFileReadLink(file, fileId = null, retry = true) {
    try {
      if (!fileId) {
        const dir = path.posix.dirname(file);
        const name = path.posix.basename(file);

        const files = await this.listFiles(dir, false);
        const target = files.find(f => f.name === name);
        if (!target) throw new Error(`file not found: ${file}`);
        fileId = target.fileId;
      }

      const params = new URLSearchParams();
      params.append('task', '22');
      params.append('file_id', fileId);

      const res = await this.client.post(API_UPLOAD, params.toString(), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
          'Referer': `${HOST_PC}/mydisk.php?item=files&action=index`,
        },
      });

      if (!res.data?.info?.is_newd || !res.data.info.f_id) {
        throw new Error('generate share link failed');
      }

      return `${res.data.info.is_newd}/${res.data.info.f_id}`;
    } catch (e) {
      if (retry) {
        this.loggedIn = false;
        await this.login();
        return this.getFileReadLink(file, fileId, false);
      }
      throw e;
    }
  }

  /* ========== 浏览器拿 iframe ========== */
  async getPageRealLinkIframeUrl(shortLink) {
    let iframeUrl = null;
    try {
      const { browser, page } = await connect({
        headless: 'new',
        args: ['--no-sandbox'],
        turnstile: true,
        connectOption: { defaultViewport: null },
      });

      page.on('response', async (response) => {
        try {
          const url = response.url();
          if (!url.includes('/fn?')) return;

          const html = await page.evaluate(() => document?.body?.innerHTML || '');
          if (html.includes('filepages1') || html.includes('load2')) {
            iframeUrl = url;
            setTimeout(() => browser.close(), 0);
          }
        } catch (_) {}
      });

      await page.goto(shortLink, { waitUntil: 'domcontentloaded' });
      await page.waitForFunction(() => false);
      await browser.close();
    } catch (_) {}
    return iframeUrl;
  }

  /* ========== 短链 → 迅雷直链（不登录） ========== */
  async getPageRealLink(shortLink) {
    const iframeUrl = await this.getPageRealLinkIframeUrl(shortLink);
    if (!iframeUrl) throw new Error('iframe url not found');

    const iframeRes = await axios.get(iframeUrl, {
      headers: { Referer: shortLink },
    });

    const html = iframeRes.data;

    const wpSignMatch = html.match(/wp_sign\s*=\s*'([^']+)'/);
    if (!wpSignMatch) throw new Error('wp_sign not found');

    const fileIdMatch = html.match(/\/ajaxm\.php\?file=(\d+)/);
    if (!fileIdMatch) throw new Error('file_id not found');

    const params = new URLSearchParams();
    params.append('action', 'downprocess');
    params.append('websignkey', 'sdQV');
    params.append('signs', 'sdQV');
    params.append('sign', wpSignMatch[1]);
    params.append('websign', '');
    params.append('kd', '1');
    params.append('ves', '1');

    const ajax = await axios.post(
      `https://wwatw.lanzn.com/ajaxm.php?file=${fileIdMatch[1]}`,
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Referer': iframeUrl,
          'X-Requested-With': 'XMLHttpRequest',
          'Origin': 'https://wwatw.lanzn.com',
        },
      }
    );

    if (ajax.data?.zt !== 1) throw new Error('get real page failed');

    const mockRealUrl = `${ajax.data.dom}/file/${ajax.data.url}&toolsdown`;

    const response = await axios.get(mockRealUrl, {
      headers: {
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9',
        'accept-language': 'zh-CN,zh;q=0.9',
        cookie: 'down_ip=1',
      },
      responseType: 'stream',
      timeout: 30000,
    });

    return `${response.request.protocol}//${response.request.host}/${response.request.path.substring(1)}`;
  }
}

module.exports = LanZou;
