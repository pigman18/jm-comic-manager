import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import iconv from 'iconv-lite';
import { createRotatingStream } from './log-rotate.js';

// koffi 是可选依赖：它用动态 require 加载原生二进制，pkg 静态分析抓不到，
// 打包后顶部静态 import 会直接抛错，而 GUI 子系统下 stderr 无处输出，
// 表现就是「双击没反应、进程静默退出」（CI 实测踩过）。
// 因此改成运行时按需 require：拿不到就让控制台功能静默降级，不影响日志文件。
const _req = createRequire(import.meta.url);
let koffi = null;
try {
  // eslint-disable-next-line global-require
  koffi = _req('koffi');
} catch {
  koffi = null;
}

const STD_OUTPUT_HANDLE = -11;
const ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004;

let _stream = null;
let _rotator = null;
let _log = null;
let _warn = null;
let _error = null;
let _forward = null;
let _ready = false;

let _hOut = null;
let _written = new Uint32Array(1);

/* ---------- ★ 新增：DevTools evaluate ---------- */
let _devtoolsEval = null;

/* ---------- kernel32 缓存 ---------- */
let _kernel32 = null;

function kernel() {
  if (_kernel32) return _kernel32;
  // koffi 不可用（打包后常见）→ 控制台相关能力整体降级，日志仍写文件
  if (!koffi) return null;

  const lib = koffi.load('kernel32.dll');

  _kernel32 = {
    AllocConsole: lib.func('AllocConsole', 'bool', []),
    GetStdHandle: lib.func('GetStdHandle', 'void*', ['int']),
    WriteConsoleA: lib.func(
        'WriteConsoleA',
        'bool',
        ['void*', 'string', 'uint', 'uint*', 'void*']
    ),
    GetConsoleMode: lib.func('GetConsoleMode', 'bool', ['void*', 'uint*']),
    SetConsoleMode: lib.func('SetConsoleMode', 'bool', ['void*', 'uint']),
  };

  return _kernel32;
}

/* ---------- 控制台直写（唯一真实出口） ---------- */
function writeConsole(msg) {
  if (!_hOut && !_devtoolsEval) return;

  // ✅ Windows 控制台
  if (_hOut) {
    try {
      const k = kernel();
      if (k) {
        const gbkBuffer = iconv.encode(msg + '\r\n', 'gbk');
        k.WriteConsoleA(_hOut, gbkBuffer, gbkBuffer.length, _written, null);
      }
    } catch {}
  }

  // ✅ DevTools（同步、无队列、无 postMessage）
  if (_devtoolsEval) {
    try {
      _devtoolsEval(msg);
    } catch {}
  }
}

function tee(msg) {
  if (_stream) _stream.write(msg + '\n');
  if (_forward) _forward(msg);
  writeConsole(msg);
}

function override() {
  console.log = (...args) => tee(args.join(' '));
  console.warn = (...args) => tee(args.join(' '));
  console.error = (...args) => tee(args.join(' '));
}

/* ---------- 控制台创建 ---------- */
export function setupConsole(visible) {
  if (!visible) return;
  try {
    const k = kernel();
    if (!k) return; // koffi 不可用 → 不开控制台，静默降级
    k.AllocConsole();
    _hOut = k.GetStdHandle(STD_OUTPUT_HANDLE);

    if (_hOut) {
      try {
        const modePtr = new Uint32Array(1);
        if (k.GetConsoleMode(_hOut, modePtr)) {
          k.SetConsoleMode(
              _hOut,
              modePtr[0] | ENABLE_VIRTUAL_TERMINAL_PROCESSING
          );
        }
      } catch {}
    }
  } catch {}
}

/* ---------- Logger ---------- */
export function createLogger(options = {}) {
  if (!_ready) {
    _log = console.log;
    _warn = console.warn;
    _error = console.error;
    _ready = true;
  }

  if (options.file) {
    try {
      fs.mkdirSync(path.dirname(options.file), { recursive: true });
      // 按大小轮转，避免单文件无限增长（实测曾达 852MB）
      _rotator = createRotatingStream({
        file: options.file,
        maxBytes: options.maxBytes,
        backups: options.backups,
      });
      _stream = _rotator.getStream();
    } catch (e) {
      _error('[logger] failed to open log file:', e.message);
    }
  }

  override();

  // 保留原始 write：koffi 不可用（打包后常见）时 _hOut 为 null，
  // 若把输出整个吞掉，会连「启动失败原因」都看不到（实测日志 0 字节、静默退出）。
  // 因此：始终同时写日志文件 + 原始 stdout；控制台可用时再额外写控制台。
  const _origStdoutWrite = process.stdout.write.bind(process.stdout);
  process.stdout.write = (chunk, enc, cb) => {
    const str = Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk);
    if (_stream) { try { _stream.write(str); } catch { /* ignore */ } }
    if (_hOut) {
      writeConsole(str.replace(/[\r\n]+$/, ''));
    } else {
      try { _origStdoutWrite(chunk, enc, cb); } catch { /* ignore */ }
    }
    return true;
  };

  return { reinstall: override, close: () => { try { _rotator?.close(); } catch { /* ignore */ } } };
}

/* ---------- ★ 新增：DevTools 注入 ---------- */
export function setDevToolsEval(fn) {
  if (typeof fn === 'function') {
    _devtoolsEval = fn;
  } else {
    _devtoolsEval = null;
  }
}