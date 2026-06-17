#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import path from "node:path";
import fs from "node:fs";
import {fileURLToPath} from "node:url";

const _dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.join(path.join(_dirname, '..'), '..');

/**
 * 指向指定脚本
 * @param cmd
 * @param args
 * @param opts
 */
export function run(cmd, args, opts) {
    const r = spawnSync(cmd, args, {
        stdio: 'inherit',
        ...(process.platform === 'win32' ? { windowsHide: true } : {}),
        ...opts,
    });
    if (r.status !== 0) process.exit(r.status ?? 1);
}

/**
 * 递归目录并将文件转换为base64
 * @param dir
 * @param base
 * @return {{}}
 */
function walk(dir, base = '') {
    const obj = {};
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, ent.name);
        const rel = base ? `${base}/${ent.name}` : ent.name;
        const key = rel.split(path.sep).join('/');
        if (ent.isDirectory()) Object.assign(obj, walk(full, rel));
        else obj[key] = fs.readFileSync(full).toString('base64');
    }
    return obj;
}

/**
 * 指定 web工程 执行 build 后打包 web-embed.json
 * @param webProjectDir     WEB工程目录
 * @param targetDir         打包后目录（会放在dist下）
 */
export function buildEmbedWeb(webProjectDir, targetDir) {
    const webPkg = path.join(webProjectDir, 'package.json');
    // 1、build WEB工程
    if (fs.existsSync(webPkg)) {
        run('npm', ['run', 'build'], { cwd: webProjectDir, shell: true });
    }
    // 2、将dist内容写成web-embedded.json
    const webDist = path.join(webProjectDir, 'dist');
    const outDir = path.join(targetDir, 'dist');
    const outFile = path.join(outDir, 'web-embedded.json');
    fs.mkdirSync(outDir, { recursive: true });
    if (!fs.existsSync(webDist)) {
        fs.writeFileSync(outFile, '{}', 'utf8');
        console.warn('[embed-web] no web/dist, wrote empty', outFile);
        process.exit(0);
    }
    const data = walk(webDist);
    fs.writeFileSync(outFile, JSON.stringify(data), 'utf8');
    console.log('[web-embed]', outFile, Object.keys(data).length, 'files');
}

/**
 * 执行webpack打包
 * @param webpackConfigJsPath       webpack.config.js 路径
 * @param targetDir                 打包后目录（会放在dist下）
 */
export function buildWebpack(webpackConfigJsPath, targetDir) {
    // 1、获取仓库根目录的 webpackJs
    const webpackJs = path.join(repoRoot, 'node_modules', 'webpack', 'bin', 'webpack.js');
    if (!fs.existsSync(webpackJs)) {
        console.error('[webpack] 仓库根目录需要安装webpack');
        process.exit(2);
    }
    run(process.execPath, [webpackJs, '--mode', 'production', '--config', webpackConfigJsPath], {
        cwd: targetDir,
    });
}

