const fs = require('node:fs');
const path = require('node:path');

/**
 * 创建文件
 * @param filePath
 */
function touchFileSync(filePath) {
  if (!fs.existsSync(filePath)) {
    // 检查filepath是否存在，如果不存在，创建它
    fs.mkdirSync(path.dirname(filePath), {recursive: true});
    // 使用fs.writeFile方法将data写入到filepath中，指定编码为utf-8
    fs.writeFileSync(filePath, '', 'utf-8');
  }
}

/**
 * 判断文件是否为空
 * @param filepath
 * @return {boolean}
 */
function isNotEmptySync(filepath) {
  if (!fs.existsSync(filepath)) {
    return false;
  }
  try {
    const stats = fs.statSync(filepath);
    return stats.size !== 0;
  } catch {
    return false;
  }
}

/**
 * 创建不存在的文件夹
 * @param dirpath
 */
function mkdirSyncIfNotExists(dirpath) {
  if (!fs.existsSync(dirpath)) {
    // 检查filepath是否存在，如果不存在，创建它
    fs.mkdirSync(dirpath, {recursive: true});
  }
}

/**
 * 写出文件内容（带创建）
 * @param filepath
 * @param data
 */
function writeToFileSync(filepath, data) {
  touchFileSync(filepath);
  // 使用fs.writeFile方法将data写入到filepath中，指定编码为utf-8
  fs.writeFileSync(filepath, data, 'utf-8');
}

/**
 * 获取目录下的全部文件
 * @param dirPath
 * @return {[]}
 */
function listFiles(dirPath) {
  let files = [];
  if (!fs.existsSync(dirPath)) {
    return files;
  }
  // 读取目录中所有文件
  const filenames = fs.readdirSync(dirPath);
  filenames.forEach(filename => {
    const filePath = path.join(dirPath, filename);
    const stat = fs.statSync(filePath);
    if (stat.isFile()) {
      files.push(filePath);
    } else if (stat.isDirectory()) {
      const subFiles = listFiles(filePath);
      files = files.concat(subFiles);
    }
  });
  return files;
}

function renameSync(source, target) {
  if (fs.existsSync(source)) {
    fs.renameSync(source, target);
  }
}

/**
 * 删除文件
 * @param file
 */
function removeFile(file) {
  if (fs.existsSync(file)) {
    fs.rmSync(file);
  }
}

let File = {
  createReadStream(filePath) {
    return fs.createReadStream(filePath);
  },
  createWriteStream(filePath) {
    return fs.createWriteStream(filePath);
  },
  async isNotEmpty(filepath) {
    return new Promise(resolve => {
      fs.stat(filepath, (err, stats) => {
        if (err) {
          resolve(false);
          return;
        }
        resolve(!err);
      });
    })
  },
  isEmptySync(filepath) {
    const stats = fs.statSync(filepath);
    return stats.size === 0;
  },
  existsSync(filePath) {
    return fs.existsSync(filePath);
  },


  /**
   * 读取文件内容
   * @param filePath
   */
  readFileSync(filePath) {
    return fs.readFileSync(filePath, 'UTF-8');
  },
  getBaseName(filename) {
    filename = path.basename(filename);
    let lastIndex = filename.lastIndexOf('.');
    if (lastIndex === -1) {
      return filename;
    }
    return filename.substring(0, lastIndex);
  },
  getExtension(filename) {
    let lastIndex = filename.lastIndexOf('.');
    if (lastIndex === -1) {
      return '';
    }
    return filename.substring(lastIndex + 1, filename.length);
  }
};

module.exports = {
  touchFileSync,
  writeToFileSync,
  isNotEmptySync,
  mkdirSyncIfNotExists,
  listFiles,
  removeFile,
  renameSync,
  ...File
};
