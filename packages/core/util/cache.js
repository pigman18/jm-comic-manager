const fs = require('node:fs');
const { writeToFileSync, isNotEmptySync, touchFileSync } = require('./file');
const { logStart, logDone, logProgress, logDoneProgress } = require('./log');

/**
 * 从缓存文件获取列表
 * @param file              缓存文件
 * @param func              文件不存在时，通过方法获取
 * @param title             标题
 * @param force
 */
async function getArrayCache(file, func, title, force) {
    logStart(title);
    let numberList = [];
    let hasProgress = false;
    if (!force && isNotEmptySync(file)) {
        try {
            numberList = JSON.parse(fs.readFileSync(file, 'UTF-8'));
            return numberList;
        } catch (e) {
            // 读取失败，正常执行
        }
    }
    numberList = await func((complete, total) => {
        logProgress(title, complete, total);
        hasProgress = true;
    });
    touchFileSync(file);
    writeToFileSync(file, JSON.stringify(numberList));
    if (hasProgress) {
        logDoneProgress(title);
    } else {
        logDone(title);
    }
    return numberList;
}

/**
 * 设置列表到缓存文件
 * @param file
 * @param array
 * @return {Promise<void>}
 */
async function setArrayCache(file, array) {
    writeToFileSync(file, JSON.stringify(array));
}

module.exports = {
    getArrayCache,
    setArrayCache
};
