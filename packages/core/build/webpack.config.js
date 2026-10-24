'use strict';
/**
 * lite打包配置，打包后，部分包需要通过npm install进行自行补全，无平台限制
 */
const fs = require('node:fs');
const path = require('node:path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const bundleRoot = path.join(__dirname, '..');
const repoRoot = path.join(bundleRoot, '..', '..');
const distDir = path.join(bundleRoot, 'dist');

module.exports = {
    mode: 'production',
    target: 'node',
    context: bundleRoot,
    entry: path.join(bundleRoot, 'src/index.js'),
    output: {
        path: distDir,
        filename: 'jm.core.js',
        libraryTarget: 'commonjs',
    },
    optimization: {
        usedExports: false,
        minimize: true,
        minimizer: [
            new TerserPlugin({
                terserOptions: {
                    compress: {collapse_vars: true, reduce_vars: true},
                    output: {comments: false},
                },
            }),
        ],
        splitChunks: false,
        runtimeChunk: false,
    },
    module: {
        rules: [
            {
                test: /\.js$/,
                parser: {dynamicImportMode: 'eager'},
            },
            {test: /\.node$/, loader: 'node-loader'},
            {test: /\.md$/, type: 'asset/source'},
            {test: /\.ico$/, type: 'asset/inline'},
        ],
        noParse: [
            /node_modules\/puppeteer/,
            /node_modules\/sleep/,
            /node_modules\/tesseract.js/,
        ],
    },
    plugins: [
        new webpack.NormalModuleReplacementPlugin(/[/\\]web-embedded\.json$/, (resource) => {
            const distEmb = path.join(distDir, 'web-embedded.json');
            const stub = path.join(__dirname, 'empty-web-embedded.json');
            resource.request = fs.existsSync(distEmb) ? distEmb : stub;
        }),
    ],
    externals: {
        'encoding': 'commonjs encoding'
    },
    resolve: {
        // 注意：'node_modules' 必须放在第一位，表示"从请求文件所在目录逐级向上找"（Node 原生规则），
        // 这样才能命中包内的嵌套依赖（如 parse5/node_modules/entities@6）。
        // 若把根 node_modules 放第一位，会强制所有依赖都从根解析，
        // 一旦根的版本不兼容（entities@4 无 ./decode 导出）就会构建失败。
        modules: ['node_modules', path.join(repoRoot, 'node_modules')],
        extensions: ['.js', '.json', '.node'],
    },
};
