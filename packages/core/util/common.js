const fs = require('node:fs');
const zlib = require('node:zlib');

/**
 * 压缩文本
 * @param text
 * @param path
 */
function zipText(text) {
  const compressed = zlib.brotliCompressSync(Buffer.from(text));
  return compressed.toString('base64');
}

/**
 * 解压文本
 * @param base64
 * @return {string}
 */
function unZipText(base64) {
  const buffer = Buffer.from(base64, 'base64');
  return zlib.brotliDecompressSync(buffer).toString();
}

/**
 * 打乱数组顺序
 * @param arr
 * @return {*}
 */
function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 尝试读取文件并转换JSON
 * @param filePath {string} 文件路径
 */
function tryReadAndParseJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, {
      encoding: 'UTF-8'
    }));
  } catch (e) {
    throw new Error(`转换JSON异常：${e}`);
  }
}

/**
 * 根据开始时间、已完成个数、总数估算剩余时间
 *
 * @param {Date|number|string} startTime - 开始时间（Date / timestamp / ISO string）
 * @param {number} finished - 已完成个数
 * @param {number} total - 总个数
 * @returns {{ remainMs: number, remainText: string }}
 */
function estimateRemainingTime(startTime, finished, total) {
  if (!finished || finished <= 0) {
    return {remainMs: Infinity, remainText: '未知'}
  }
  if (finished >= total) {
    return {remainMs: 0, remainText: '已完成'}
  }
  const start = new Date(startTime).getTime();
  const now = Date.now();
  const elapsedMs = now - start;
  const avgMsPerItem = elapsedMs / finished;
  const remainCount = total - finished;
  const remainMs = avgMsPerItem * remainCount;
  const remainText = formatDuration(remainMs);
  return {remainMs, remainText}
}

/**
 * 毫秒耗时 → x天x时x分x秒x毫秒（自动省略 0 项）
 * @param {number} ms - 耗时（毫秒）
 * @returns {string}
 */
function formatDuration(ms) {
  // 全部向下取整，保证“只取整数”
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const milliseconds = Math.floor(ms % 1000);
  return [
    days && `${days}天`,
    hours && `${hours}时`,
    minutes && `${minutes}分`,
    seconds && `${seconds}秒`,
    `${milliseconds}毫秒`
  ]
    .filter(Boolean)
    .join('')
}

/**
 * 重试
 * @param func              主执行逻辑
 * @param errorFunc         错误回调
 * @param retryCount        重试次数
 * @param maxRetryCount     最大重试次数
 * @return {*|Promise<*>}
 */
async function retryAndCatch(func, errorFunc, maxRetryCount = 5, retryCount = 0) {
  try {
    // 1、执行主执行逻辑
    return await func();
  } catch (err) {
    if (!!err.ignoredThrow) {
      return null;
    }
    // 2、发生错误
    let exit = false;
    if (errorFunc && 'function' === typeof (errorFunc)) {
      // 3、调用错误回调
      let result = await errorFunc(err, retryCount);
      exit = !!result;
    }
    // 4、满足重试条件
    if (!exit && retryCount < maxRetryCount) {
      retryCount += 1;
      await sleep(200 + 200 * Math.random());
      return retryAndCatch(func, errorFunc, maxRetryCount, retryCount);
    }
    // 5、无法继续重试1，抛出异常
    throw err;
  }
}

function values(obj) {
  let map = {};
  for (let key in obj) {
    if (obj.hasOwnProperty(key)) {
      map[key] = obj[key];
    }
  }
  return Object.values(map);
}

/**
 * 休眠
 * @param time
 * @return {Promise<unknown>}
 */
async function sleep(time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve(true);
    }, time);
  });
}

/**
 * list转map
 * @param list
 * @param key
 * @return {{}}
 */
function list2Map(list, key = 'id') {
  let map = {};
  list.forEach((obj) => {
    map[obj[key]] = obj;
  });
  return map;
}

/**
 * 划分数组
 *  [1, 2, 3, 4, 5] => [1, 2][3, 4][5]
 * @param arr
 * @param size
 * @return {*}
 */
function chunkArray(arr, size) {
  return arr.map((_, i) => arr.slice(i * size, i * size + size))
    .filter(a => !!a && a.length > 0);
}

function containsAny(arr1, arr2) {
  let flag = false;
  for (let e of (arr1 || [])) {
    flag = (arr2 || []).indexOf(e) !== -1;
    if (flag) {
      break;
    }
  }
  return flag;
}

/**
 * 从指定列表中，将相同value汇集起来
 * @param list              列表
 * @param keyProperty       key属性，比如 编码
 * @param valueProperty     值属性，比如 面颜色
 * @param withSkipFunc      跳过函数，返回 true 就是跳过
 * @return object
 */
function getKeyAndValues(list, keyProperty, valueProperty, withSkipFunc = (key) => '默认' === key) {
  // 1、汇总key和值
  let keyAndValue = {};
  // 2、过滤存在指定 property 的样式
  (list || [])
    .forEach((s) => {
      if (!s.hasOwnProperty(keyProperty) || !s.hasOwnProperty(valueProperty)) {
        return;
      }
      let key = s[keyProperty];
      let value = s[valueProperty];
      let withSkip = withSkipFunc(key);
      if (!!withSkip) {
        return;
      }
      keyAndValue[key] = value;
    });
  return keyAndValue;
}

/**
 * 合并map结构，暂时只支持到2级合并
 * 1、key不存在时合并
 * 2、key存在时，如果是列表则追加，是object则合并
 * @param maps
 */
function mergeMaps(maps) {
  let allMap = {};
  (maps || []).forEach((map) => {
    for (let key in map) {
      if (map.hasOwnProperty(key)) {
        let value = map[key];
        if (allMap.hasOwnProperty(key)) {
          let existsValue = allMap[key];
          let isArray1 = Array.isArray(existsValue);
          let isArray2 = Array.isArray(value);
          let isObject1 = typeof (existsValue) === 'object';
          let isObject2 = typeof (value) === 'object';
          if (isArray1 && isArray2) {
            allMap[key] = [
              ...existsValue,
              ...value
            ]
          } else if (isObject1 && isObject2) {
            allMap[key] = {
              ...existsValue,
              ...value
            }
          } else {
            throw new Error(`存在无法合并的key：${key}`);
          }
        } else {
          allMap[key] = value;
        }
      }
    }
  });
  return allMap;
}

/**
 * map排序
 * @param map
 * @param keys
 */
function sortMap(map, keys) {
  let allKeys = JSON.parse(JSON.stringify(keys));
  Object.keys(map).forEach((key) => {
    if (keys.indexOf(key) === -1) {
      keys.push(key);
    }
  });
  allKeys.forEach((key) => {
    if (map.hasOwnProperty(key)) {
      let temp = map[key];
      delete map[key];
      map[key] = temp;
    }
  });
}

module.exports = {
  shuffleArray,
  tryReadAndParseJson,
  formatDuration,
  retryAndCatch,
  values,
  sleep,
  estimateRemainingTime,
  list2Map,
  chunkArray,
  containsAny,
  getKeyAndValues,
  mergeMaps,
  sortMap,
  zipText,
  unZipText
};
