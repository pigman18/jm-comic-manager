'use strict'

const notifier = require('node-notifier')
const AsyncLock = require('async-lock');
const lock = new AsyncLock();

// 1、导入协议、样式
const protocol = require('./protocol');
const {PHASE, STATE, STEP, ERR} = protocol;
const {createConsoleRenderer} = require('../util/console-renderer');
const defaultTheme = require(`../build/theme/default.json`);
const darkTheme = require(`../build/theme/dark.json`);
const lightTheme = require(`../build/theme/light.json`);

/**
 * JM 模块消息分发器
 * @param manifest    JM 模块应用配置
 * @param ctx         上下文对象
 * @param mod         JM 模块
 */
function createMessage(manifest, ctx, mod) {
    // 1、定义全局消息处理器
    let dispatchers = {};

    let theme = {
        'default': defaultTheme,
        'dark': darkTheme,
        'light': lightTheme
    }[manifest.theme] || defaultTheme;

    manifest.themeDetail = theme;

    /**
     * 创建控制台消息转化器
     * @return {*}
     */
    function getConsoleRenderer() {
        return createConsoleRenderer(protocol, theme, {
            time: true,
            renderBody(payload) {
                const parts = []
                if (payload.number) {
                    parts.push(`（${payload.number}）`)
                }
                if (payload.url) {
                    parts.push(`→ ${payload.url}`)
                }
                if (payload.file) {
                    parts.push(`→ ${payload.file}`)
                }
                if (payload.text) {
                    parts.push(payload.text)
                }
                return parts.join(' ')
            },
        })
    }

    // 2、创建控制台消息转化器
    let consoleRender = getConsoleRenderer();
    // 3、绑定各种消息转发
    start();

    function start() {
        // 1、注册控制台消息处理器
        dispatchers.console = (payload) => {
            const text = consoleRender.render(payload);
            if (payload.hasOwnProperty('complete') && payload.hasOwnProperty('total')) {
                // 打印进度
                // process.stdout.write(`\r${text}`);
                // ✅ 关键：同一行覆盖
                console.log('\x1B[1A\x1B[K' + text);
            } else {
                console.log(text);
            }
        };
        // 2、注册window通知消息处理器
        // dispatchers.notifier = (payload) => {
        //   let {
        //     phase,
        //     state
        //   } = payload;
        //   if (protocol.STATE.SUCCESS === state) {
        //     notifier.notify({
        //       title: phase,
        //       message: state,
        //       sound: true,
        //       wait: true,
        //     });
        //   }
        // };
        // 3、注册electron消息处理器
        dispatchers.electron = (payload) => {
            const text = consoleRender.render(payload);
            ctx.log?.({raw: payload, text});
        };
        // jmDialog = createJMDialog(ctx, serverConfig);
        // dispatchers.dialog = (payload) => {
        //     jmDialog?.handlePayload(payload);
        // };
        // 4、注册ws消息处理器
        dispatchers.ws = (payload) => {
            mod?.server?.sendMessage(payload);
        };
    }

    function close() {
        delete dispatchers.console;
        delete dispatchers.notifier;
        delete dispatchers.electron;
        delete dispatchers.ws;
    }


    /**
     * 统一消息处理
     * @param payload
     */
    function onMessage(payload) {
        for (let key in dispatchers) {
            if (dispatchers.hasOwnProperty(key)) {
                let dispatcher = dispatchers[key];
                if (dispatcher && 'function' === typeof (dispatcher)) {
                    try {
                        dispatcher(payload);
                    } catch (err) {
                        console.log(`执行消息处理器异常：${key} ${err.message}`);
                    }
                }
            }
        }
    }

    /**
     * 执行任务（带锁）
     * @param phase         任务标记
     * @param phaseFunc     任务函数，注意如果有进度的，要把进度内容包含在结果里面
     * @param phaseData     任务数据
     * @param lockFlag      锁标记
     * @return {Promise<*>}
     */
    async function doLockPhase(phase, phaseFunc, phaseData = {}, lockFlag) {
        lockFlag = lockFlag || phase
        return await lock.acquire(lockFlag, async () => {
            return await doPhase(phase, phaseFunc, phaseData);
        });
    }

    /**
     * 合并可序列化数据
     * @param value
     * @return {{}}
     */
    function safeSpread(value) {
        // 非对象或 null，直接返回空对象
        if (value === null || typeof value !== 'object') {
            return {};
        }
        // 数组也直接忽略（避免 [...arr] 语义混乱）
        if (Array.isArray(value)) {
            return {};
        }
        const result = {};
        for (const [key, val] of Object.entries(value)) {
            if (isSerializable(val)) {
                result[key] = val;
            }
        }
        return result;
    }

    /**
     * 判断数据是否可序列化
     * @param val
     * @return {boolean}
     */
    function isSerializable(val) {
        if (val === undefined) return false;
        if (typeof val === 'function') return false;
        if (typeof val === 'symbol') return false;
        if (typeof val === 'bigint') return false;

        // ❗ 明确排除 Stream
        if (
            val &&
            typeof val === 'object' &&
            typeof val.pipe === 'function'
        ) {
            return false;
        }

        // ❗ 可选：排除 Buffer
        if (Buffer.isBuffer(val)) {
            return false;
        }

        try {
            JSON.stringify(val);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 执行任务
     * @param phase         任务标记
     * @param phaseFunc     任务函数，注意如果有进度的，要把进度内容包含在结果里面
     * @param phaseData     任务数据
     * @return {Promise<*>}
     */
    async function doPhase(phase, phaseFunc, phaseData = {}) {
        // 1、定义【任务数据】
        let phaseMessageData = {
            phase: phase,
            state: STATE.START,
            startTime: new Date().getTime(),
            ...safeSpread(phaseData)
        };
        // 2、通知任务开始
        onMessage(phaseMessageData);
        // 3、定义步骤执行函数
        let stepHandler = {
            /**
             * 执行步骤
             * @param step            步骤标记
             * @param stepFunc        步骤函数
             * @param stepData        步骤数据
             * @param inStep          步骤执行回调
             * @return {Promise<void>}
             */
            doStep: async (step, stepFunc, stepData = {}, inStep = (stepMessageData, onProgress) => {
            }) => {
                // 1、定义【步骤数据】
                let stepMessageData = {
                    ...phaseMessageData,
                    state: STATE.RUNNING,
                    step: step,
                    stepState: STATE.START,
                    stepStartTime: new Date().getTime(),
                    ...safeSpread(stepData)
                };
                // 2、通知步骤开始
                onMessage(stepMessageData);
                inStep?.(stepMessageData);
                try {
                    // 2、执行步骤
                    let onProgress = function (complete, total) {
                        stepMessageData.complete = complete;
                        stepMessageData.total = total;
                        onMessage({
                            ...stepMessageData,
                            stepState: STATE.RUNNING
                        });
                    };
                    let stepResult = await stepFunc(stepMessageData, onProgress);
                    // 3、通知步骤完成
                    onMessage({
                        ...stepMessageData,
                        stepState: STATE.SUCCESS,
                        stepEndTime: new Date().getTime(),
                        ...safeSpread(stepResult)
                    });
                    inStep?.(stepMessageData);
                    return stepResult;
                } catch (e) {
                    // 4、通知步骤失败
                    onMessage({
                        ...stepMessageData,
                        stepState: STATE.ERROR,
                        stepEndTime: new Date().getTime(),
                        error: e
                    });
                    inStep?.(stepMessageData);
                    if (e.ignoredThrow) {
                        // console.log(e.message);
                    } else {
                        throw e;
                    }
                }
            }
        };
        try {
            // 4、执行任务
            let phaseResult = await phaseFunc(stepHandler, phaseMessageData);
            // 5、通知任务完成
            onMessage({
                ...phaseMessageData,
                state: STATE.SUCCESS,
                endTime: new Date().getTime(),
                ...safeSpread(phaseResult)
            });
            return phaseResult;
        } catch (e) {
            // 6、通知任务失败
            onMessage({
                ...phaseMessageData,
                state: STATE.ERROR,
                endTime: new Date().getTime(),
                error: e
            });
            if (e.ignoredThrow) {
                // console.log(e.message);
            } else {
                throw e;
            }
        }
    }

    return {
        onMessage,
        doLockPhase,
        doPhase,
        close,
        dispatchers,
        consoleRender
    }

}

module.exports = {
    createMessage
};
