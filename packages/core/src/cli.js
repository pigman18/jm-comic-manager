'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');
const {Command} = require('commander');
const PQueue = require('p-queue').default;

const {ERR} = require('./protocol');
const {sleep, shuffleArray, formatDuration} = require('../util/common');
const {touchFileSync, writeToFileSync, isNotEmptySync} = require('../util/file');
const {parseNumber} = require("./parser");

function createCli(
    manifest,
    ctx,
    argv,
    message,
    config,
    store,
    crawler,
    server
) {
    const program = new Command();
    const queue = new PQueue({concurrency: 30});

    program.description(manifest.description)
        .version(manifest.version, null, '查看版本')
        .helpOption('-h --help', '查看帮助')
        .command('help [command]')
        .description('查看命令帮助')
        .action((cmd) => {
            program.commands.find(c => c.name() === cmd)?.outputHelp();
        });

    /**
     * 检查是否有html已导出标记
     * @param number
     * @return {boolean}
     */
    function existsHtmlFlag(number) {
        return fs.existsSync(`${manifest.workspace}/temp/html/${number}.txt.flag`);
    }


    /* ================= Server ================= */

    program
        .command('server')
        .description('本地服务')
        .action(async () => {
            await server.start();
        });

    /* ================= 工具 ================= */

    const readNumbers = (file) => {
        const p = path.isAbsolute(file)
            ? file
            : path.resolve(process.cwd(), file);

        if (!fs.existsSync(p)) {
            throw new Error(`未找到文件：${p}`);
        }
        return JSON.parse(fs.readFileSync(p, 'utf-8'));
    };

    const wait = () => sleep(50 + Math.random() * 50);

    async function processBatch(list, fn, size = 15) {
        const total = list.length;
        let complete = 0;
        const startTime = Date.now();
        while (list.length) {
            const batch = list.splice(0, size);
            batch.forEach(i => queue.add(async () => {
                try { await fn(i) } catch {}
                complete++;
                const remaining = total - complete;
                const elapsedMs = Date.now() - startTime;
                const avgMs = elapsedMs / complete;
                const etaMs = avgMs * remaining;
                console.log(`✅ 已执行 ${complete} | 剩余 ${remaining} | 已用 ${formatDuration(elapsedMs)} | 预计还需 ${formatDuration(etaMs)}`);
            }));
            await queue.onIdle();
        }
    }

    /* ================= 执行器 ================= */

    const runSingle = async (label, number, action) => {
        console.log(`${label} ${number}`);

        try {
            await action(number);
            touchFileSync(`${manifest.workspace}/temp/html/${number}.txt.flag`);
            console.log(`✅ 完成 ${number}`);
        } catch (e) {
            if (ERR.INFO_NOT_FOUND.message === e.message || ERR.COMIC_NOT_FOUND.message === e.message) {
                touchFileSync(`${manifest.workspace}/temp/html/${number}.txt.flag`);
            }
            console.log(`❌ ${number} 失败：${e.message}`);
        }
    };

    const runBatch = async (label, file, action, filterBatch) => {
        let numbers = readNumbers(file);

        if (!!filterBatch && 'function' === typeof (filterBatch)) {
            numbers = filterBatch(numbers);
        }

        if (!numbers.length) {
            console.log('没有需要处理的编号');
            return;
        }

        console.log(`${label} 共 ${numbers.length} 个`);

        await processBatch(numbers, async (n) => {
            try {
                await runSingle(label, n, action);
            } finally {
                writeToFileSync(file, JSON.stringify(numbers));
            }

            await wait();
        });

        console.log('全部处理完成');
    };

    const runInteractive = async (label, action) => {
        console.log('[交互模式] 输入编号后回车，Ctrl+C 退出\n');

        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        const ask = () =>
            new Promise(resolve => rl.question('编号 > ', resolve));

        while (true) {
            const input = await ask();
            if (!input) continue;
            await runSingle(label, input, action);
        }
    };

    /* ================= Config ================= */

    program
        .command('config')
        .description('交互式配置')
        .action(async () => {
            const {intro, outro, text, multiline, confirm, isCancel, note, log} = require('@clack/prompts');

            intro('JM漫画管理器 配置');

            const cfg = config.get();
            const changed = {};

            function setVal(k, v) {
                changed[k] = v;
                cfg[k] = v;
            }

            const fields = [
                {key: 'username',   label: 'JM 账号'},
                {key: 'password',   label: 'JM 密码'},
                {key: 'dataDir',    label: '数据目录'},
                {key: 'port',       label: '端口'},
                {key: 'comicViewer',label: '漫画阅读器'},
                {key: 'host',       label: 'JM 主站'},
                {key: 'cdnHosts',   label: 'CDN 域名'},
                {key: 'apiHosts',   label: 'API 域名'},
                {key: 'timeout',    label: '请求超时'},
                {key: 'debug',      label: '调试模式'},
            ];

            function displayVal(key) {
                const v = cfg[key];
                if (Array.isArray(v)) return v.length ? v.join(', ') : '(未设置)';
                if (typeof v === 'boolean') return v ? '开' : '关';
                if (typeof v === 'string') return v || '(未设置)';
                return String(v ?? '(未设置)');
            }

            function isSet(key) {
                const v = cfg[key];
                if (Array.isArray(v)) return v.length > 0;
                if (typeof v === 'boolean') return true;
                if (typeof v === 'string') return v.length > 0;
                return v != null;
            }

            loop:
            while (true) {
                console.log('');
                for (let i = 0; i < fields.length; i++) {
                    const f = fields[i];
                    const val = displayVal(f.key);
                    const marker = isSet(f.key) ? '●' : '○';
                    console.log(`  ${String(i + 1).padStart(2)}. ${marker} ${f.label.padEnd(10)} ${val}`);
                }
                console.log('');
                const choice = await text({
                    message: '输入编号修改 (s 保存退出)',
                    validate: (val) => {
                        if (val === 's' || val === '') return;
                        const n = Number(val);
                        if (isNaN(n) || n < 1 || n > fields.length) return '请输入 1~' + fields.length + ' 或 s';
                    },
                });

                if (isCancel(choice) || choice === '') { outro('已取消'); return; }
                if (choice === 's') break loop;

                const idx = Number(choice) - 1;
                const field = fields[idx];
                const key = field.key;

                if (key === 'username') {
                    const v = await text({message: 'JM 账号', initialValue: cfg.username || ''});
                    if (!isCancel(v)) setVal('username', v ?? '');
                } else if (key === 'password') {
                    const v = await text({message: 'JM 密码', initialValue: cfg.password || ''});
                    if (!isCancel(v)) setVal('password', v ?? '');
                } else if (key === 'dataDir') {
                    const browseDir = await confirm({message: '打开浏览窗口选择文件夹？', initialValue: true});
                    if (isCancel(browseDir)) continue;
                    if (browseDir) {
                        const {pickDirectory} = require('node-fs-dialogs');
                        const p = await pickDirectory({defaultPath: cfg.dataDir || process.cwd()});
                        if (p) setVal('dataDir', p);
                    } else {
                        const v = await text({message: '数据目录', initialValue: cfg.dataDir || ''});
                        if (!isCancel(v)) setVal('dataDir', v ?? '');
                    }
                } else if (key === 'port') {
                    const v = await text({
                        message: '端口',
                        initialValue: String(cfg.port ?? 47310),
                        validate: (val) => isNaN(Number(val)) ? '必须是数字' : undefined,
                    });
                    if (!isCancel(v)) setVal('port', Number(v));
                } else if (key === 'comicViewer') {
                    const browseExe = await confirm({message: '打开浏览窗口选择文件？', initialValue: true});
                    if (isCancel(browseExe)) continue;
                    if (browseExe) {
                        const {pickFile} = require('node-fs-dialogs');
                        const p = await pickFile({
                            filters: [{name: '可执行文件', extensions: ['exe']}],
                            defaultPath: cfg.comicViewer || 'C:\\Program Files',
                        });
                        if (p) setVal('comicViewer', p);
                    } else {
                        const v = await text({message: '漫画阅读器路径', initialValue: cfg.comicViewer || ''});
                        if (!isCancel(v)) setVal('comicViewer', v ?? '');
                    }
                } else if (key === 'host') {
                    const v = await text({message: 'JM 主站', initialValue: cfg.host || 'https://18comic.vip'});
                    if (!isCancel(v)) setVal('host', v ?? 'https://18comic.vip');
                } else if (key === 'cdnHosts') {
                    const v = await multiline({
                        message: 'CDN 域名（每行一个，空行提交）',
                        initialValue: (cfg.cdnHosts || []).join('\n'),
                    });
                    if (!isCancel(v)) setVal('cdnHosts', (v ?? '').split('\n').map(s => s.trim()).filter(Boolean));
                } else if (key === 'apiHosts') {
                    const v = await multiline({
                        message: 'API 域名（每行一个，空行提交）',
                        initialValue: (cfg.apiHosts || []).join('\n'),
                    });
                    if (!isCancel(v)) setVal('apiHosts', (v ?? '').split('\n').map(s => s.trim()).filter(Boolean));
                } else if (key === 'timeout') {
                    const v = await text({
                        message: '请求超时（毫秒）',
                        initialValue: String(cfg.timeout ?? 86400000),
                        validate: (val) => isNaN(Number(val)) ? '必须是数字' : undefined,
                    });
                    if (!isCancel(v)) setVal('timeout', Number(v));
                } else if (key === 'debug') {
                    const v = await confirm({message: '启用调试日志', initialValue: cfg.debug ?? false});
                    if (!isCancel(v)) setVal('debug', v);
                }
            }

            const keys = Object.keys(changed);
            if (keys.length) {
                for (const k of keys) config.setValue(k, changed[k]);
                note(keys.length + ' 项配置已保存', '完成');
            } else {
                note('无修改', '完成');
            }
            outro('配置完成');
        });

    /* ================= Album ================= */

    program
        .command('album:meta [number]')
        .description('查询漫画')
        .option('-f, --file <file>')
        .action(async (number, opts) => {
            const action = async (number) => {
                number = parseNumber(number);
                let file = `${config.dataDir}/info/${number}.json`;
                if (isNotEmptySync(file)) {
                    // 1、本地文件存在时，解压本地文件
                    try {
                        return JSON.parse(fs.readFileSync(file, 'utf-8'));
                    } catch (_) {}
                }
                // 2、请求最新内容
                let meta = await crawler.comic.getMeta(number);
                if (!meta) {
                    throw ERR.INFO_NOT_FOUND;
                }
                // 3、保存漫画压缩内容
                writeToFileSync(file, JSON.stringify(meta));
                return meta;
            };
            if (number) return runSingle('拉取元数据', number, action);
            if (opts.file) return runBatch('拉取元数据', opts.file, action, (numbers) => {
                return numbers.filter((number) => !existsHtmlFlag(number));
            });
            return runInteractive('拉取元数据', action);
        });

    program
        .command('album:download [number]')
        .description('下载漫画')
        .option('-f, --file <file>')
        .addHelpText('after', `
Examples:
 $ node jm.bundle album:download 114514
 $ node jm.bundle album:download -f config/下载列表.txt
`)
        .action(async (number, opts) => {
            const action = async (n) => {
                try {
                    await crawler.comic.downloadArchive(n);
                } catch (e) {
                    console.error(`下载漫画失败：${number} ${e}`);
                }
            };
            if (number) return runSingle('下载漫画', number, action);
            if (opts.file) return runBatch('下载漫画', opts.file, action);
            return runInteractive('下载漫画', action);
        });

    /* ================= Album:Download:Batch ================= */

    /**
     * 从文件中移除指定内容的行（处理文件占用）
     * @param {string} filePath 文件路径
     * @param {string} lineToRemove 要移除的行内容
     */
    async function removeLineFromFile(filePath, lineToRemove) {
        const maxRetries = 5;
        let retryCount = 0;

        while (retryCount < maxRetries) {
            try {
                // 读取文件内容
                const content = fs.readFileSync(filePath, 'UTF-8');
                const lines = content.split('\n');

                // 过滤掉要移除的行（精确匹配）
                const newLines = lines.filter(line => line.trim() !== lineToRemove.trim());

                // 写回文件
                const newContent = newLines.join('\n');
                fs.writeFileSync(filePath, newContent, 'UTF-8');

                return;
            } catch (e) {
                retryCount++;
                if (retryCount >= maxRetries) {
                    console.error(`无法更新文件（被占用）：${filePath}`);
                    throw e;
                }
                // 等待后重试
                await sleep(500 * retryCount);
            }
        }
    }

    program
        .command('album:download:batch')
        .description('批量下载漫画（持续监听模式）')
        .requiredOption('-f, --file <file>', '下载列表文件路径')
        .addHelpText('after', `
Examples:
 $ node jm.bundle album:download:batch -f config/下载列表.txt

说明：
  该命令会持续监听文件，每行读取一个漫画编号进行下载
  下载完成后会自动将该行移至 temp/同名文件.completed
  按 Ctrl+C 退出监听模式
`)
        .action(async (opts) => {
            const {sleep} = require('../util/common');
            const {touchFileSync, writeToFileSync, removeFile} = require('../util/file');

            // 1、解析文件路径
            const inputFile = path.isAbsolute(opts.file)
                ? opts.file
                : path.resolve(process.cwd(), opts.file);

            // 2、创建 temp 目录和完成标记文件路径
            const fileName = path.basename(inputFile);
            const completedFile = path.join(manifest.workspace, 'temp', `${fileName}.completed`);
            touchFileSync(completedFile);

            if (!fs.existsSync(inputFile)) {
                console.error(`输入文件不存在：${inputFile}`);
                return;
            }

            console.log(`开始批量下载监听`);
            console.log(`输入文件：${inputFile}`);
            console.log(`完成记录：${completedFile}`);
            console.log(`按 Ctrl+C 退出监听\n`);

            // 3、处理单行任务的函数
            const processLine = async (line, lineNumber) => {
                const number = line.trim();
                if (!number) return false;

                console.log(`\n[${new Date().toLocaleString()}] 开始下载第 ${lineNumber} 行：${number}`);

                try {
                    await crawler.comic.downloadArchive(number);
                    console.log(`✅ 下载完成：${number}`);

                    // 追加到完成记录文件
                    const completedContent = fs.existsSync(completedFile)
                        ? fs.readFileSync(completedFile, 'UTF-8')
                        : '';
                    writeToFileSync(completedFile, completedContent + number + '\n');

                    // 从输入文件移除该行
                    await removeLineFromFile(inputFile, number);

                    return true;
                } catch (e) {
                    console.error(`❌ 下载失败：${number} - ${e.message}`);
                    return false;
                }
            };

            // 4、主循环
            let lineNumber = 0;
            let consecutiveEmptyReads = 0;

            while (true) {
                try {
                    // 读取文件内容
                    let content = '';
                    try {
                        content = fs.readFileSync(inputFile, 'UTF-8');
                    } catch (e) {
                        // 文件可能被占用，稍后重试
                        console.log('⚠️  文件被占用，等待 3 秒后重试...');
                        await sleep(3000);
                        continue;
                    }

                    // 按行分割
                    const lines = content.split('\n').filter(line => line.trim());

                    if (lines.length === 0) {
                        consecutiveEmptyReads++;

                        // 首次检测到空时输出提示
                        if (consecutiveEmptyReads === 1) {
                            console.log('\n⏳ 等待新任务：输入文件为空，请在文件中添加漫画编号...');
                        }

                        // 等待 5 秒后重新检查
                        await sleep(5000);
                        continue;
                    }

                    // 重置空读计数
                    consecutiveEmptyReads = 0;

                    // 处理第一行
                    const firstLine = lines[0];
                    lineNumber++;
                    const success = await processLine(firstLine, lineNumber);

                    if (success) {
                        console.log(`📝 进度：剩余 ${lines.length - 1} 个任务\n`);
                    } else {
                        console.log(`⚠️  任务失败，保留该行，3 秒后重试...\n`);
                        await sleep(3000);
                    }

                    // 短暂等待，避免过快读取
                    await sleep(1000);

                } catch (e) {
                    console.error(`监听过程出错：${e.message}`);
                    await sleep(5000);
                }
            }
        });

    /* ================= Search ================= */

    program
        .command('search:keyword <keyword>')
        .description('关键字搜索')
        .action(async (k) => {
            console.log(`搜索 ${k}`);
            const list = await crawler.search.byKeyword(k);
            console.log(`找到 ${list.length} 条`);
            list.forEach(i => console.log(i.aid));
        });

    /* ================= Rank ================= */

    program
        .command('rank:weekly')
        .description('每周必看')
        .action(async () => {
            console.log('拉取每周必看');
            const list = await crawler.rank.weekly();
            console.log(`共 ${list.length} 条`);
            list.forEach(i => console.log(i.aid));
        });

    program
        .command('rank:serials')
        .description('每周连载')
        .action(async () => {
            console.log('拉取每周连载');
            const list = await crawler.rank.serials();
            console.log(`共 ${list.length} 条`);
            list.forEach(i => console.log(i.aid));
        });

    /* ================= Sync ================= */

    program
        .command('local2db')
        .description('本地 info 文件同步到数据库')
        .action(async () => {
            console.log('同步本地 → 数据库...');
            const count = await store.runLocal2Db();
            console.log(`同步完成，共处理 ${count} 条`);
        });

    program
        .command('db2local')
        .description('数据库同步到本地 info 文件')
        .action(async () => {
            console.log('同步数据库 → 本地...');
            const count = await store.runDb2Local();
            console.log(`同步完成，共导出 ${count} 条`);
        });

    /* ================= Covers ================= */

    program
        .command('covers')
        .description('批量下载封面')
        .action(async () => {
            const fileDir = path.join(config.dataDir, 'file');
            const conn = await store.connect();
            const rows = conn.prepare(`SELECT id FROM comic_meta WHERE series_id IS NULL OR series_id = '' OR series_id = '0' OR series_id = id`).all();
            const numbers = rows.map(r => r.id).filter(n => !fs.existsSync(`${fileDir}/media/albums/${n}.jpg`));
            if (!numbers.length) {
                console.log('没有需要下载封面的漫画');
                return;
            }
            console.log(`共 ${numbers.length} 个封面待下载`);
            let done = 0;
            await processBatch(numbers, async (n) => {
                const cdnHost = config.cdnHosts[Math.floor(Math.random() * config.cdnHosts.length)];
                const url = `${cdnHost}/media/albums/${n}.jpg`;
                try {
                    await crawler.fetchRemoteFile(url);
                } catch (e) {
                    console.log(`  ❌ JM${n}: ${e.message}`);
                }
                done++;
            });
            console.log(`封面下载完成，共 ${done} 个`);
        });

    /* ================= Readme / Changelog ================= */
    const { marked } = require('marked');
    const { markedTerminal } = require('marked-terminal');
    marked.use(markedTerminal());

    function renderMarkdown(text) {
        if (!text) { console.log('（无内容）'); return }
        console.log(marked.parse(text));
    }

    program
        .command('readme')
        .description('显示 README')
        .action(() => { renderMarkdown(manifest.readme) });

    program
        .command('changelog')
        .description('显示 CHANGELOG')
        .action(() => { renderMarkdown(manifest.changelog) });

    return {
        run: async () => {
            // 只有“完全没有任何参数”才走默认 server
            if (argv.length === 0) {
                console.log('未指定命令，默认启动本地服务...');
                await server.start();
                return;
            }
            program.parse(argv, {from: 'user'});
        }
    };
}

module.exports = {createCli};
