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
        filename: 'jm.bundle.js',
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
        modules: [path.join(repoRoot, 'node_modules'), 'node_modules'],
        extensions: ['.js', '.json', '.node'],
    },
};
