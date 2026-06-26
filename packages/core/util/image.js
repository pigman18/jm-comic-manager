'use strict';

const { Jimp } = require('jimp');

/**
 * 转换为base64图片
 * @param {Buffer} buffer
 */
function buffer2Base64Image(buffer) {
    const base64 = buffer.toString('base64');
    const mimeType = 'image/jpeg';
    return `data:${mimeType};base64,${base64}`;
}

const BLOCK = 108;

function _quantize5(c) {
    return (c >> 3) & 0x1f;
}

function _dominantColor(tiny) {
    const d = tiny.bitmap.data;
    const freq = new Map();
    for (let i = 0; i < d.length; i += 4) {
        const key = (_quantize5(d[i]) << 10) | (_quantize5(d[i + 1]) << 5) | _quantize5(d[i + 2]);
        freq.set(key, (freq.get(key) || 0) + 1);
    }
    let bestKey = 0, bestCnt = 0;
    for (const [k, c] of freq) {
        if (c > bestCnt) { bestCnt = c; bestKey = k; }
    }
    const dr = (bestKey >> 10) & 0x1f;
    const dg = (bestKey >> 5) & 0x1f;
    const db = bestKey & 0x1f;
    return [dr << 3, dg << 3, db << 3];
}

/**
 * 对图片进行像素化和谐处理（与前端 createHarmonyDataUrl 算法一致）
 * @param {Buffer|string} input - 图片 Buffer 或文件路径
 * @param {number} outW - 输出宽度
 * @param {number} outH - 输出高度
 * @returns {Promise<Buffer>} - JPEG Buffer
 */
async function harmonizeImage(input, outW, outH) {
    const src = await Jimp.read(input);
    const bw = Math.max(1, Math.ceil(outW / BLOCK));
    const bh = Math.max(1, Math.ceil(outH / BLOCK));

    // 1. downscale to tiny
    const tiny = src.clone().resize({ w: bw, h: bh });

    // 2. dominant color
    const [dr, dg, db] = _dominantColor(tiny);

    // 3. output filled with dominant color
    const out = new Jimp({ width: outW, height: outH, color: 0x00000000 });
    out.scan(0, 0, outW, outH, function (_x, _y, idx) {
        this.bitmap.data[idx] = dr;
        this.bitmap.data[idx + 1] = dg;
        this.bitmap.data[idx + 2] = db;
        this.bitmap.data[idx + 3] = 255;
    });

    // 4. composite tiny stretched to full size at 0.7 alpha
    tiny.resize({ w: outW, h: outH });
    out.composite(tiny, 0, 0, { opacitySource: 0.7 });

    return out.getBuffer('image/jpeg');
}

module.exports = {
    buffer2Base64Image,
    harmonizeImage
}
