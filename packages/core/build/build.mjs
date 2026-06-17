#!/usr/bin/env node
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEmbedWeb, buildWebpack } from "../../build/build-util.mjs";

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const coreProjectRoot = path.join(_dirname, '..');
const repoRoot = path.join(path.join(coreProjectRoot, '..'), '..');

// 1、打包web工程
const webProjectRoot = path.join(repoRoot, 'packages/web');
buildEmbedWeb(webProjectRoot, coreProjectRoot);

// 2、打包webpack
buildWebpack(path.join(_dirname, 'webpack.config.js'), coreProjectRoot);
buildWebpack(path.join(_dirname, 'webpack.config.all.js'), coreProjectRoot);

console.log('[jm.bundle build] ok');
