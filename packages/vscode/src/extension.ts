import * as path from 'path';
import * as vscode from 'vscode';
import {tmpdir} from 'os';
import {writeFileSync} from 'fs';
import {JMWebviewViewProvider} from './JMWebviewViewProvider'
import {createConfig} from './jm.config.enhance';
import {registerMessageDispatcher} from "./jm.message.enhance";

let jmBundle: any;
let started = false;
let viewRegistered = false;
let statusBarItem: vscode.StatusBarItem;
const configChangeDebounceMs = 500;
let configChangeTimer: NodeJS.Timeout | undefined;

async function loadBundle(context: vscode.ExtensionContext) {
    const runtimeRequire = eval('require');
    const bundlePath = path.join(context.extensionPath, 'dist', 'jm.bundle.all.js');
    try {
        jmBundle = runtimeRequire(bundlePath);
        vscode.window.showInformationMessage('JM主模块加载成功。');
    } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        vscode.window.showErrorMessage(
            'JM主模块加载失败。',
            {
                modal: true,
                detail: err.message
            },
            '知道了'
        );
    }
}

async function enable(context: vscode.ExtensionContext) {
    if (!jmBundle || started) return;
    statusBarItem.text = '$(loading~spin) jm';
    statusBarItem.backgroundColor = undefined;
    statusBarItem.color = undefined;
    await jmBundle.start(context, { createConfig });
    started = true;
    const proxy = jmBundle.state.config.proxy;
    if (proxy) {
        await vscode.workspace.getConfiguration('http').update('proxy', proxy, vscode.ConfigurationTarget.Global);
        statusBarItem.text = '$(check) jm（proxy）';
    } else {
        statusBarItem.text = '$(check) jm';
    }
    statusBarItem.color = new vscode.ThemeColor('terminal.ansiBrightGreen');
    registerView(context);
    registerMessageDispatcher(context, jmBundle);
}

async function disable() {
    if (!jmBundle || !started) return;
    statusBarItem.text = '$(loading~spin) jm';
    statusBarItem.color = undefined;
    await jmBundle.stop();
    started = false;
    const proxy = jmBundle.state.config.proxy;
    if (proxy) {
        await vscode.workspace.getConfiguration('http').update('proxy', undefined, vscode.ConfigurationTarget.Global);
    }
    statusBarItem.text = '$(circle-slash) jm';
    statusBarItem.backgroundColor = undefined;
    statusBarItem.color = undefined;
}

function createStatusBarItem() {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    statusBarItem.text = '$(circle-slash) jm';
    statusBarItem.tooltip = '点击启动 JM';
    statusBarItem.command = 'jm.toggle';
    statusBarItem.show();
}

function registerCommand(context: vscode.ExtensionContext) {
    context.subscriptions.push(
        vscode.commands.registerCommand('jm.setDataDir', async () => {
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: false,
                canSelectFolders: true,
                canSelectMany: false,
                title: '选择数据目录',
            });
            if (!uris || uris.length === 0) return;
            await vscode.workspace
                .getConfiguration('jm')
                .update('dataDir', uris[0].fsPath, vscode.ConfigurationTarget.Global);
            vscode.window.showInformationMessage(
                `下载目录已设置为：${uris[0].fsPath}`
            );
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('jm.setComicViewer', async () => {
            const uris = await vscode.window.showOpenDialog({
                canSelectFiles: true,
                canSelectFolders: false,
                canSelectMany: false,
                title: '选择 ComicRack 阅读器',
                filters: {
                    '可执行文件': ['exe'],
                    '所有文件': ['*']
                },
                defaultUri: vscode.Uri.file('C:\\')
            });
            if (!uris || uris.length === 0) {
                return;
            }
            const filePath = uris[0].fsPath;
            if (!filePath.toLowerCase().endsWith('comicrack.exe')) {
                const choice = await vscode.window.showWarningMessage(
                    `选中的文件不是 ComicRack.exe，确定要使用吗？`,
                    '确定',
                    '重新选择'
                );
                if (choice !== '确定') {
                    return;
                }
            }
            await vscode.workspace
                .getConfiguration('jm')
                .update('comicViewer', filePath, vscode.ConfigurationTarget.Global);

            vscode.window.showInformationMessage(
                `漫画阅读器已设置为：${filePath}`
            );
        })
    );
    context.subscriptions.push(vscode.commands.registerCommand('jm.comic.downloadArchive', async () => {
        if (!jmBundle) {
            vscode.window.showErrorMessage('JM 主模块尚未加载');
            return;
        }
        const input = await vscode.window.showInputBox({
            title: '下载漫画',
            prompt: '请输入漫画编号',
            placeHolder: '例如：114514',
            validateInput(value) {
                return /^\d+$/.test(value)
                    ? null
                    : '请输入数字编号';
            }
        });
        if (!input) return;
        await jmBundle.state.crawler.comic.downloadArchive(Number(input), false);
    }));
    context.subscriptions.push(
        vscode.commands.registerCommand('jm.openBrowser', () => {
            if (!jmBundle) {
                vscode.window.showErrorMessage('JM 主模块尚未加载');
                return;
            }
            const url = `${jmBundle.state.server.homeUrl}`;
            vscode.env.openExternal(vscode.Uri.parse(url));
        })
    );
    context.subscriptions.push(
        vscode.commands.registerCommand('jm.toggle', async () => {
            if (started) {
                await disable();
            } else {
                await enable(context);
            }
        })
    );
}

function registerView(context: vscode.ExtensionContext) {
    if (!jmBundle || viewRegistered) {
        return;
    }
    viewRegistered = true;
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(JMWebviewViewProvider.viewType, new JMWebviewViewProvider(jmBundle.state.server.homeUrl || ''), {
            webviewOptions: {
                retainContextWhenHidden: true,
            },
        })
    );
}

export async function activate(context: vscode.ExtensionContext) {
    registerCommand(context);
    await loadBundle(context);
    createStatusBarItem();
    context.subscriptions.push(statusBarItem);
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (!jmBundle) return;
            const relevantKeys = ['jm.dataDir', 'jm.proxy', 'jm.username', 'jm.password', 'jm.port'];
            const changed = relevantKeys.some(k => e.affectsConfiguration(k));
            if (!changed) return;
            if (started) {
                if (configChangeTimer) clearTimeout(configChangeTimer);
                configChangeTimer = setTimeout(async () => {
                    await disable();
                    await enable(context);
                }, configChangeDebounceMs);
            }
        })
    );
    context.subscriptions.push({
        dispose() {
            writeFileSync(
                path.join(tmpdir(), 'jm_dispose.txt'),
                'dispose@' + Date.now() + '\n',
                { flag: 'a' }
            );
            jmBundle?.stop();
        }
    });
    await enable(context);
}

export async function deactivate() {
    vscode.window.showInformationMessage('JM主模块卸载成功。');
    jmBundle?.stop();
}
