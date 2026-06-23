import fs from 'fs';
import path from 'path';
import koffi from 'koffi';
import iconv from 'iconv-lite';

// ★ 新增常量
const STD_OUTPUT_HANDLE = -11;
const ENABLE_VIRTUAL_TERMINAL_PROCESSING = 0x0004;

let _stream = null;
let _log = null;
let _warn = null;
let _error = null;
let _forward = null;
let _ready = false;

let _hOut = null;
let _written = new Uint32Array(1);

/* ---------- kernel32 缓存（不换调用方式） ---------- */
let _kernel32 = null;

function kernel() {
  if (_kernel32) return _kernel32;

  const lib = koffi.load('kernel32.dll');

  _kernel32 = {
    AllocConsole: lib.func('AllocConsole', 'bool', []),
    GetStdHandle: lib.func('GetStdHandle', 'void*', ['int']),
    WriteConsoleA: lib.func(
        'WriteConsoleA',
        'bool',
        ['void*', 'string', 'uint', 'uint*', 'void*']
    ),
    // ★ 新增两个 API
    GetConsoleMode: lib.func('GetConsoleMode', 'bool', ['void*', 'uint*']),
    SetConsoleMode: lib.func('SetConsoleMode', 'bool', ['void*', 'uint']),
  };

  return _kernel32;
}

/* ---------- 控制台直写 ---------- */
function writeConsole(msg) {
  if (!_hOut) return;
  try {
    const k = kernel();
    // ✅ 去掉 ANSI 颜色（注释掉，保留颜色）
    // const cleanMsg = String(msg).replace(/\x1B\[[0-9;]*m/g, '');
    const gbkBuffer = iconv.encode(msg + '\r\n', 'gbk');
    k.WriteConsoleA(_hOut, gbkBuffer, gbkBuffer.length, _written, null);
  } catch {}
}

function tee(msg) {
  if (_stream) _stream.write(msg + '\n');
  if (_forward) _forward(msg);
  writeConsole(msg); // ✅ writeConsole 自己管 \r\n
}

function override() {
  console.log = (...args) => {
    tee(args.join(' '));
  };

  console.warn = (...args) => {
    tee(args.join(' '));
  };

  console.error = (...args) => {
    tee(args.join(' '));
  };
}

/* ---------- 控制台创建 ---------- */
export function setupConsole(visible) {
  if (!visible) return;
  try {
    const k = kernel();
    k.AllocConsole();
    _hOut = k.GetStdHandle(STD_OUTPUT_HANDLE); // ★ 使用常量

    // ★ 启用虚拟终端处理（让 ANSI 颜色生效）
    if (_hOut) {
      try {
        const modePtr = new Uint32Array(1);
        if (k.GetConsoleMode(_hOut, modePtr)) {
          k.SetConsoleMode(_hOut, modePtr[0] | ENABLE_VIRTUAL_TERMINAL_PROCESSING);
        }
      } catch {}
    }
  } catch {}
}

/* ---------- Logger ---------- */
export function createLogger(options = {}) {
  if (!_ready) {
    // ✅ 不要 bind，直接引用
    _log = console.log;
    _warn = console.warn;
    _error = console.error;
    _ready = true;
  }

  if (options.file) {
    try {
      fs.mkdirSync(path.dirname(options.file), { recursive: true });
      _stream = fs.createWriteStream(options.file, { flags: 'a' });
    } catch (e) {
      _error('[logger] failed to open log file:', e.message);
    }
  }

  override();

  // 主要用于express的日志输出，只在这里注册1次
  process.stdout.write = (chunk) => {
    const str = Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk);
    // ✅ 去掉 chunk 自带的换行
    writeConsole(str.replace(/[\r\n]+$/, ''));
  };

  return { reinstall: override };
}

export function setForward(fn) {
  _forward = fn;
}