'use strict';
/**
 * /file 域名白名单（SSRF 防护）测试
 * 运行：node test/file-host-guard.test.js
 */
const assert = require('node:assert');
const {createFileHostGuard, isPrivateIpv4, isIpLiteral, hostnameOf} = require('../packages/core/src/security/file-host-guard');

let pass = 0;
let fail = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    pass++;
  } catch (e) {
    console.error(`  ✗ ${name}\n    ${e.message}`);
    fail++;
  }
}

const config = {
  host: 'https://18comic.vip',
  cdnHosts: ['https://cdn-msp.18comic.vip', 'https://www.cdngwc.cc'],
  apiHosts: ['https://www.cdnhjk.net'],
};
const guard = createFileHostGuard(config);

console.log('/file 域名白名单');

test('允许主站域名', () => {
  assert.strictEqual(guard('https://18comic.vip/media/a.jpg').ok, true);
});

test('允许 CDN 域名', () => {
  assert.strictEqual(guard('https://cdn-msp.18comic.vip/media/a.jpg').ok, true);
  assert.strictEqual(guard('https://www.cdngwc.cc/media/a.jpg').ok, true);
});

test('允许 API 域名', () => {
  assert.strictEqual(guard('https://www.cdnhjk.net/x').ok, true);
});

test('允许白名单域名的子域', () => {
  assert.strictEqual(guard('https://img.18comic.vip/a.jpg').ok, true);
});

test('拒绝 localhost', () => {
  const r = guard('http://localhost:8080/admin');
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /本机/);
});

test('拒绝 127.0.0.1', () => {
  const r = guard('http://127.0.0.1:47310/api/settings');
  assert.strictEqual(r.ok, false);
});

test('拒绝内网 192.168.x.x', () => {
  assert.strictEqual(guard('http://192.168.1.1/').ok, false);
});

test('拒绝内网 10.x.x.x', () => {
  assert.strictEqual(guard('http://10.0.0.5/').ok, false);
});

test('拒绝内网 172.16-31.x.x', () => {
  assert.strictEqual(guard('http://172.16.0.1/').ok, false);
  assert.strictEqual(guard('http://172.31.255.1/').ok, false);
  // 172.32 不在私有段，但仍因"IP 直连"被拒
  assert.strictEqual(guard('http://172.32.0.1/').ok, false);
});

test('拒绝云元数据地址 169.254.169.254', () => {
  assert.strictEqual(guard('http://169.254.169.254/latest/meta-data/').ok, false);
});

test('拒绝公网 IP 直连（白名单只收域名）', () => {
  const r = guard('http://8.8.8.8/x');
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /IP/);
});

test('拒绝未知域名', () => {
  const r = guard('https://evil.example.com/a.jpg');
  assert.strictEqual(r.ok, false);
  assert.match(r.reason, /白名单/);
});

test('拒绝非 http(s) 协议', () => {
  assert.strictEqual(guard('file:///etc/passwd').ok, false);
  assert.strictEqual(guard('ftp://18comic.vip/a').ok, false);
  assert.strictEqual(guard('javascript:alert(1)').ok, false);
});

test('拒绝无效 URL', () => {
  assert.strictEqual(guard('not-a-url').ok, false);
  assert.strictEqual(guard('').ok, false);
});

test('拒绝大小写混淆的域名（不匹配白名单）', () => {
  // 主机名会被 URL 规范化成小写，因此 EVIL.COM 不等于白名单
  assert.strictEqual(guard('https://EVIL.COM/a').ok, false);
});

test('允许配置中 allowedFileHosts 追加的域名', () => {
  const g2 = createFileHostGuard({...config, allowedFileHosts: ['example.org']});
  assert.strictEqual(g2('https://example.org/a.jpg').ok, true);
  // 但子域也允许
  assert.strictEqual(g2('https://img.example.org/a.jpg').ok, true);
});

test('hostnameOf 正确解析', () => {
  assert.strictEqual(hostnameOf('https://A.B.com/x'), 'a.b.com');
  assert.strictEqual(hostnameOf('cdn.com'), 'cdn.com');
  assert.strictEqual(hostnameOf(''), '');
});

test('isPrivateIpv4 判定', () => {
  assert.strictEqual(isPrivateIpv4('127.0.0.1'), true);
  assert.strictEqual(isPrivateIpv4('10.1.2.3'), true);
  assert.strictEqual(isPrivateIpv4('192.168.0.1'), true);
  assert.strictEqual(isPrivateIpv4('8.8.8.8'), false);
  assert.strictEqual(isPrivateIpv4('example.com'), false);
});

test('isIpLiteral 判定', () => {
  assert.strictEqual(isIpLiteral('1.2.3.4'), true);
  assert.strictEqual(isIpLiteral('[::1]'), true);
  assert.strictEqual(isIpLiteral('example.com'), false);
});

console.log(`\n结果: ${pass} 通过, ${fail} 失败`);
process.exit(fail > 0 ? 1 : 0);
