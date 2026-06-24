const path = require('path');
const addon = require(path.resolve(__dirname, 'build/Release/taskbar_progress.node'));

/**
 * 设置任务栏进度条
 * @param {number} value -1 清除，0~1 显示进度
 */
function setProgress(value) {
    if (process.platform !== 'win32') return;
    try { addon.setProgress(value); } catch {}
}

/**
 * 不确定进度（滚动绿光）
 */
function setIndeterminate() {
    if (process.platform !== 'win32') return;
    try { addon.setIndeterminate(); } catch {}
}

/**
 * 错误态（红色）
 */
function setError() {
    if (process.platform !== 'win32') return;
    try { addon.setError(); } catch {}
}

module.exports = { setProgress, setIndeterminate, setError };