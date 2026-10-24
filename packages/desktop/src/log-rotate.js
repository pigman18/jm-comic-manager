import fs from 'fs';
import path from 'path';

/**
 * 日志轮转
 *
 * 背景：桌面端日志为单文件追加，实测已增长到 852 MB，既占磁盘又拖慢读写。
 *
 * 策略（简单可靠，不引入第三方依赖）：
 * - 按大小轮转：写入前检查文件大小，超过 maxBytes 就重命名归档
 * - 归档命名：<name>.1 / <name>.2 ...，保留 backups 个，最旧的删除
 * - 检查频率：每写 N 行或每 M 毫秒检查一次，避免每行都 stat
 */

const DEFAULT_MAX_BYTES = 20 * 1024 * 1024; // 20 MB
const DEFAULT_BACKUPS = 3;

/**
 * 生成归档路径
 * @param {string} file
 * @param {number} index 1-based
 */
function archivePath(file, index) {
  return `${file}.${index}`;
}

/**
 * 执行一次轮转：file → file.1，file.1 → file.2 ...
 * @param {string} file
 * @param {number} backups
 */
function rotate(file, backups) {
  // backups=0 表示不保留归档：直接清空当前文件内容即可
  if (!backups || backups <= 0) {
    try { if (fs.existsSync(file)) fs.truncateSync(file, 0); } catch { /* ignore */ }
    return;
  }

  // 删除最旧的
  const oldest = archivePath(file, backups);
  try { if (fs.existsSync(oldest)) fs.unlinkSync(oldest); } catch { /* ignore */ }

  // 从后往前重命名
  for (let i = backups - 1; i >= 1; i--) {
    const from = archivePath(file, i);
    const to = archivePath(file, i + 1);
    try {
      if (fs.existsSync(from)) {
        if (fs.existsSync(to)) fs.unlinkSync(to);
        fs.renameSync(from, to);
      }
    } catch { /* ignore */ }
  }

  // 当前文件 → .1
  try {
    if (fs.existsSync(file)) fs.renameSync(file, archivePath(file, 1));
  } catch { /* ignore */ }
}

/**
 * 创建一个可轮转的写入流包装
 * @param {object} options
 * @param {string} options.file          日志文件路径
 * @param {number} [options.maxBytes]    单文件上限，默认 20MB
 * @param {number} [options.backups]     保留归档数，默认 3
 * @return {{write:(s:string)=>void, close:()=>void, getStream:()=>fs.WriteStream|null}}
 */
export function createRotatingStream(options) {
  const file = options.file;
  const maxBytes = Number(options.maxBytes) > 0 ? Number(options.maxBytes) : DEFAULT_MAX_BYTES;
  const backups = Number.isInteger(options.backups) && options.backups >= 0 ? options.backups : DEFAULT_BACKUPS;

  let stream = null;
  let written = 0;   // 本次进程内已写入字节（用于减少 stat 次数）
  let sinceCheck = 0;

  function open() {
    try {
      fs.mkdirSync(path.dirname(file), { recursive: true });
      // 启动时如果已经超限，先轮转一次
      try {
        const st = fs.statSync(file);
        if (st.size >= maxBytes) rotate(file, backups);
        else written = st.size;
      } catch { written = 0; }
      stream = fs.createWriteStream(file, { flags: 'a' });
      stream.on('error', () => { /* 写日志失败不应影响主流程 */ });
    } catch {
      stream = null;
    }
  }

  function doRotate() {
    try { stream?.end(); } catch { /* ignore */ }
    stream = null;
    rotate(file, backups);
    written = 0;
    open();
  }

  function write(text) {
    if (!stream) return;
    try {
      stream.write(text);
      const bytes = Buffer.byteLength(text, 'utf8');
      written += bytes;
      sinceCheck += bytes;
      // 每累计 1MB 才检查一次，兼顾及时性与性能
      if (written >= maxBytes && sinceCheck >= 1024 * 1024) {
        sinceCheck = 0;
        doRotate();
      } else if (written >= maxBytes) {
        // 即使未到检查阈值，只要已超限也轮转
        sinceCheck = 0;
        doRotate();
      }
    } catch { /* ignore */ }
  }

  function close() {
    try { stream?.end(); } catch { /* ignore */ }
    stream = null;
  }

  open();

  return {
    write,
    close,
    getStream: () => stream,
  };
}

export { rotate, DEFAULT_MAX_BYTES, DEFAULT_BACKUPS };
