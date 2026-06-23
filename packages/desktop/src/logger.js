import fs from 'fs';
import path from 'path';
import koffi from 'koffi';
import iconv from 'iconv-lite';

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

/* ---------- ★ 新增：DevTools evaluate ---------- */
let _devtoolsEval = null;

/* ---------- kernel32 缓存 ---------- */
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
      const gbkBuffer = iconv.encode(msg + '\r\n', 'gbk');
      k.WriteConsoleA(_hOut, gbkBuffer, gbkBuffer.length, _written, null);
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
      _stream = fs.createWriteStream(options.file, { flags: 'a' });
    } catch (e) {
      _error('[logger] failed to open log file:', e.message);
    }
  }

  override();

  process.stdout.write = (chunk) => {
    const str = Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk);
    writeConsole(str.replace(/[\r\n]+$/, ''));
  };

  return { reinstall: override };
}

/* ---------- ★ 新增：DevTools 注入 ---------- */
export function setDevToolsEval(fn) {
  if (typeof fn === 'function') {
    _devtoolsEval = fn;
  } else {
    _devtoolsEval = null;
  }
}