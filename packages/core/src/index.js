// jm.bundle.js
'use strict'

const {createMessage} = require('./message');
const {createConfig} = require('./config');
const {createStore} = require('./store');
const {createCrawler} = require('./crawler');
const {createServer} = require('./server');
const {createCli} = require('./cli');
const {createTaskManager} = require('./taskManager');

// 1、加载JM模块应用配置，里面直接包含服务器配置、命令行配置
let manifest = require(`../package.json`);
// 2、设置当前工作目录
manifest.workspace = process.cwd();
// 3、加载文档内容（dev 模式读文件，webpack 构建时通过 asset/source 内联）
let readmeContent = '', changelogContent = '';
try { readmeContent = require('../../../README.md') } catch { try { readmeContent = require('node:fs').readFileSync(require('node:path').join(__dirname, 'README.md'), 'utf8') } catch {} }
try { changelogContent = require('../../../CHANGELOG.md') } catch { try { changelogContent = require('node:fs').readFileSync(require('node:path').join(__dirname, 'CHANGELOG.md'), 'utf8') } catch {} }
manifest.readme = readmeContent;
manifest.changelog = changelogContent;

/**
 * 定义一个完整模块
 * 1、配置读写
 * 2、模块
 * 3、服务器
 * 4、命令行
 */
function createJmBundle(manifest) {
    // 2、主要用到的对象
    let state = {
        config: null,
        message: null,
        store: null,
        crawler: null,
        server: null,
        cli: null,
        taskManager: null,
    };


    /**
     * 插件加载
     * @param ctx               上下文对象
     * @param enhanceMethods    增强方法
     * @return {Promise<void>}
     */
    async function start(ctx, enhanceMethods = {}) {
        // 1、加载JM模块用户配置
        state.config = (enhanceMethods.createConfig || createConfig)(manifest, ctx);
        // 2、加载JM模块消息分发器
        state.message = (enhanceMethods.createMessage || createMessage)(manifest, ctx, state);
        // 3、加载JM模块爬虫
        state.crawler = (enhanceMethods.createCrawler || createCrawler)(manifest, ctx, state.message, state.config);
        // 4、加载JM模块数据存储
        state.store = (enhanceMethods.createStore || createStore)(manifest, ctx, state.message, state.config, state.crawler);
        // 5、加载JM模块任务管理器
        state.taskManager = (enhanceMethods.createTaskManager || createTaskManager)(manifest, ctx, state.store, state.crawler, state.message, state.config);
        // 6、加载JM模块服务器（需要 taskManager 用于 WS 消息路由）
        state.server = (enhanceMethods.createServer || createServer)(manifest, ctx, state.message, state.config, state.store, state.crawler, state.taskManager);
        // 7、给 taskManager 注入 server 引用，使其能广播消息
        state.taskManager.setServer(state.server);
        // 8、服务开始
        const {homeUrl} = await state.server.start();
        console.log(`加载模块：【${manifest.id}】【${homeUrl}】`);
    }

    /**
     * 插件卸载
     * “监听类 / 服务型对象” → stop()
     * “普通资源 / 容器类对象” → close()
     * @return {Promise<void>}
     */
    async function stop() {
        if (state.server) await state.server?.stop() && (state.server = null);
        if (state.store) await state.store?.close() && (state.store = null);
        if (state.crawler) await state.crawler?.close() && (state.crawler = null);
        if (state.message) await state.message?.close() && (state.message = null);
        if (state.config) await state.config?.close() && (state.config = null);
        console.log(`卸载模块：${manifest.id}`);
    }

    /**
     * 命令行模式
     * @param argv              命令行参数
     * @return {Promise<void>}
     */
    async function run(argv) {
        let mockCtx = {};
        // 1、加载JM模块用户配置
        state.config = createConfig(manifest, mockCtx);
        // 2、加载JM模块消息分发器
        state.message = createMessage(manifest, mockCtx, state);
        // 3、加载JM模块爬虫
        state.crawler = createCrawler(manifest, mockCtx, state.message, state.config);
        // 4、加载JM模块数据存储
        state.store = createStore(manifest, mockCtx, state.message, state.config, state.crawler);
        // 5、加载JM模块任务管理器
        state.taskManager = createTaskManager(manifest, mockCtx, state.store, state.crawler, state.message, state.config);
        // 6、加载JM模块服务器（需要 taskManager 用于 WS 消息路由）
        state.server = createServer(manifest, mockCtx, state.message, state.config, state.store, state.crawler, state.taskManager);
        // 7、给 taskManager 注入 server 引用，使其能广播消息
        state.taskManager.setServer(state.server);
        // 8、加载JM模块命令行
        state.cli = createCli(manifest, mockCtx, argv, state.message, state.config, state.store, state.crawler, state.server);
        await state.cli.run();
    }

    return {
        start,
        stop,
        run,
        state
    }

}

let bundle = createJmBundle(manifest);

if (process.argv[1] && require('node:path').resolve(process.argv[1]) === __filename) {
    (async () => {
        try {
            await bundle.run(process.argv.slice(2));
        } catch (e) {
            console.error(e);
            process.exitCode = 1
        } finally {
            // await mod.deactivate();
        }
    })();
}

module.exports = bundle;
