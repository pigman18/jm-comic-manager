'use strict';

/**
 * 转换为base64图片
 * @param {Buffer} buffer
 */
function buffer2Base64Image(buffer) {
    const base64 = buffer.toString('base64');
    const mimeType = 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
}

module.exports = {
    buffer2Base64Image
}