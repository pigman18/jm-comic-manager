import * as vscode from "vscode";

class JmConfigValue {
    host: string = 'https://18comic.vip';
    cdnHost: string[] = [
        "https://cdn-msp.18comic.vip",
        "https://cdn-msp2.18comic.vip",
        "https://cdn-msp3.18comic.vip"
    ];
    headless: boolean = false;
    username: string = '';
    password: string = '';
    dataDir: string = '';
    port: number = 47310;
    proxy: string = '';
    comicViewer: string = '';
    timeout: number = 86400000;
    cookie: string = '';
    userAgent: string = '';
}

/**
 * 重载jmConfig
 * @param manifest
 * @param ctx
 */
export function createConfig(manifest: any, ctx: vscode.ExtensionContext) {

    /**
     * 修改为从vscode获取配置
     */
    function get() {
        const cfg = vscode.workspace.getConfiguration('jm');
        return {
            host: 'https://18comic.vip',
            cdnHost: [
                "https://cdn-msp.18comic.vip",
                "https://cdn-msp2.18comic.vip",
                "https://cdn-msp3.18comic.vip"
            ],
            headless: false,
            username: cfg.get('username'),
            password: cfg.get('password'),
            dataDir: cfg.get('dataDir'),
            port: cfg.get<number>('port'),
            proxy: cfg.get('proxy'),
            comicViewer: cfg.get('comicViewer'),
            timeout: cfg.get('timeout'),
            cookie: cfg.get('cookie'),
            userAgent: cfg.get('userAgent'),
        } as JmConfigValue;
    }

    let _config: JmConfigValue = get();
    const out = {
        get,
        setValue,
        close,
        ..._config
    };

    function setValue<K extends keyof JmConfigValue>(key: K, value: any) {
        _config[key] = value;
        out[key] = value;
        // 设置数据到vscode
        vscode.workspace
            .getConfiguration('jm')
            .update(key, value, vscode.ConfigurationTarget.Global);
    }

    function close() {

    }

    return out;
}
