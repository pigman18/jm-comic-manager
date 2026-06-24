// gen-icon.js
const sharp = require('sharp');
const toIco = require('to-ico');
const fs = require('fs');
const { vectorize, ColorMode, Hierarchical, PathSimplifyMode } = require('@neplex/vectorizer');

const sizes = [16, 32, 48, 64, 128, 256];
const tmpDir = 'tmp-icons';

if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

(async () => {
    // 1. 生成各尺寸 PNG
    await Promise.all(
        sizes.map(size =>
            sharp('../resources/icon.png')
                .resize(size, size, { fit: 'contain', background: { r:0,g:0,b:0,alpha:0 } })
                .png()
                .toFile(`${tmpDir}/icon-${size}.png`)
        )
    );

    // 2. 合成标准 ICO（to-ico 会自动处理 PNG 压缩 256）
    const buffers = await Promise.all(
        sizes.map(s => fs.promises.readFile(`${tmpDir}/icon-${s}.png`))
    );

    const ico = await toIco(buffers);

    fs.writeFileSync(
        '../resources/icon.ico', ico);

    const src = fs.readFileSync('../resources/icon.png');
    const svg = await vectorize(src, {
        colorMode: ColorMode.Color,
        colorPrecision: 6,
        filterSpeckle: 4,
        spliceThreshold: 45,
        cornerThreshold: 60,
        hierarchical: Hierarchical.Stacked,
        mode: PathSimplifyMode.Spline,
        layerDifference: 5,
        lengthThreshold: 5,
        maxIterations: 2,
        pathPrecision: 5,
    });
    fs.writeFileSync('../resources/icon.svg', svg);
    console.log('✅ SVG 已生成');

    console.log('✅ icon 生成完成');
})();
