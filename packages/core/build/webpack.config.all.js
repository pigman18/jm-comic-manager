'use strict';
/**
 * all打包配置，打包后js可直接使用，但是有平台限制
 */
const fs = require('node:fs');
const path = require('node:path');
const webpack = require('webpack');
const TerserPlugin = require('terser-webpack-plugin');

const bundleRoot = path.join(__dirname, '..');
const distDir = path.join(bundleRoot, 'dist');
const { execSync } = require('child_process');

module.exports = {
    target: 'node',
    mode: 'production',
    context: bundleRoot,
    entry: path.join(bundleRoot, 'src/index.js'),
    output: {
        path: distDir,
        filename: 'jm.bundle.all.js',
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
            {
                test: /\.(js|mjs|node)$/,
                loader: '@vercel/webpack-asset-relocator-loader',
                options: { outputAsset: false },
            },
            {test: /\.md$/, type: 'asset/source'},
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
};
