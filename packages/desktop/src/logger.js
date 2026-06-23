import fs from 'fs';
import path from 'path';
import koffi from 'koffi';

let _stream = null;
let _log = null;
let _warn = null;
let _error = null;
let _forward = null;
let _ready = false;

function tee(msg) {
  if (_stream) _stream.write(msg + '\n');
  if (_forward) _forward(msg);
}

function override() {
  console.log   = (...args) => { const m = args.join(' '); tee(m); _log(m); };
  console.warn  = (...args) => { const m = args.join(' '); tee(m); _warn(m); };
  console.error = (...args) => { const m = args.join(' '); tee(m); _error(m); };
}

export function setupConsole(visible) {
  if (visible) return;
  try {
    // 尽早加载，减少中间模块初始化带来的延迟
    const kernel32 = koffi.load('kernel32.dll');
    const user32 = koffi.load('user32.dll');
    const GetConsoleWindow = kernel32.func('GetConsoleWindow', 'void*', []);
    const ShowWindow = user32.func('ShowWindow', 'bool', ['void*', 'int']);
    const FreeConsole = kernel32.func('FreeConsole', 'bool', []); // 可选
    const hwnd = GetConsoleWindow();
    if (hwnd && hwnd !== 0n) { // 注意 BigInt 指针比较
      // SW_HIDE = 0
      ShowWindow(hwnd, 0);
      // 对于纯 GUI 无控制台需求，FreeConsole 更彻底，防止父进程复用导致窗口复现
      // FreeConsole();
    }
  } catch {}
}

export function createLogger(options = {}) {
  if (!_ready) {
    _log = console.log.bind(console);
    _warn = console.warn.bind(console);
    _error = console.error.bind(console);
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
  return { reinstall: override };
}

export function setForward(fn) {
  _forward = fn;
}
