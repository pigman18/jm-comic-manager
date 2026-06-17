'use strict'

// 统一日志打印，方便接入electron

// 只定义一次，避免重复注入
if (!Date.prototype.format) {
    Date.prototype.format = function (fmt) {
        const o = {
            'y+': this.getFullYear(),
            'M+': this.getMonth() + 1,
            'd+': this.getDate(),
            'H+': this.getHours(),
            'm+': this.getMinutes(),
            's+': this.getSeconds(),
            'q+': Math.floor((this.getMonth() + 3) / 3), // 季度
            'S+': this.getMilliseconds()
        };
        for (const k in o) {
            if (new RegExp(`(${k})`).test(fmt)) {
                fmt = fmt.replace(
                    RegExp.$1,
                    RegExp.$1.length === 1
                        ? o[k]
                        : String(o[k]).padStart(RegExp.$1.length, '0')
                )
            }
        }
        return fmt
    }
};

/**
 * 开始、运行、完成、错误 的状态标记
 * @type {{DONE: string, RUNNING: string, START: string, ERROR: string}}
 */
let STATUS_TEXT = {
    START: '\x1b[36m[>]\x1b[0m',   // cyan
    RUNNING: '\x1b[33m[*]\x1b[0m', // yellow
    DONE: '\x1b[32m[#]\x1b[0m',    // green
    ERROR: '\x1b[31m[!]\x1b[0m'    // red
};

/**
 * 打印开始
 * @param title
 */
function logStart(title) {
    console.log(`${STATUS_TEXT.START} ${new Date().format('yyyy-MM-dd HH:mm:ss')} ${title || ''}已开始`);
}

/**
 * 打印执行
 * @param title
 * @param end
 */
function logRunning(title, end = '进行中') {
    console.log(`${STATUS_TEXT.RUNNING} ${new Date().format('yyyy-MM-dd HH:mm:ss')} ${title || ''}${end}`);
}

/**
 * 打印完成
 * @param title
 * @param end
 */
function logDone(title, end = '已完成') {
    console.log(`${STATUS_TEXT.DONE} ${new Date().format('yyyy-MM-dd HH:mm:ss')} ${title || ''}${end}`);
}

/**
 * 打印错误
 * @param title
 * @param err
 */
function logError(title, err) {
    console.error(`${STATUS_TEXT.ERROR} ${new Date().format('yyyy-MM-dd HH:mm:ss')} ${title || ''}已失败：${err}`);
    console.log(err);
}

/**
 * 打印进度
 * 完成后需要自行 console.log('\n')
 * @param title
 * @param complete
 * @param total
 * @return {{total: *, title: *, complete: *, percent: number}}
 */
function logProgress(title, complete, total) {
    const percent = !total ? 100 : ((complete / total) * 100).toFixed(2);
    process.stdout.write(`\r${STATUS_TEXT.RUNNING} ${title || ''}进度：${percent}%`);
    return {
        title,
        complete,
        total,
        percent
    }
}

/**
 * 打印进度完成
 * @param title
 */
function logDoneProgress(title) {
    console.log(`\n${STATUS_TEXT.DONE} ${new Date().format('yyyy-MM-dd HH:mm:ss')} ${title || ''}已完成`);
}

module.exports = {
    logStart,
    logRunning,
    logDone,
    logError,
    logProgress,
    logDoneProgress
};
