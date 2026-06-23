import { useState, useEffect, useRef } from 'react';
import './App.css';

interface Config {
    username?: string;
    password?: string;
    dataDir?: string;
    port?: number;
    comicViewer?: string;
    timeout?: number;
    debug?: boolean;
    host?: string;
    cdnHosts?: string[];
    apiHosts?: string[];
}

declare global {
    interface Window {
        ewvjs?: {
            api?: {
                loadConfig: () => Promise<Config>;
                saveConfig: (cfg: Config) => Promise<{ ok: boolean; message?: string }>;
                configSaved: () => Promise<void>;
                configExited: () => Promise<void>;
                getServerUrl: () => Promise<string>;
                restartApp: () => Promise<void>;
                refreshPage: () => Promise<void>;
                hideToTray: () => Promise<void>;
                openDataDir: () => Promise<void>;
                openConfigDir: () => Promise<void>;
                openBrowser: () => Promise<void>;
                browseDir: (defaultPath?: string) => Promise<string>;
                browseFile: (defaultPath?: string) => Promise<string>;
            };
        };
        __showSettingsModal?: () => void;
        __onServerReady?: () => void;
    }
}

function App() {
    const [mode, setMode] = useState<'loading' | 'config' | 'main'>('loading');
    const [serverUrl, setServerUrl] = useState('');

    useEffect(() => {
        (async () => {
            const api = window.ewvjs?.api;
            if (!api) return;
            const cfg = await api.loadConfig();
            if (cfg && cfg.username) {
                const url = await api.getServerUrl();
                setServerUrl(url);
                setMode('main');
            } else {
                setMode('config');
            }
        })();
    }, []);

    window.__showSettingsModal = () => {
        setSettingsOpen(true);
    };

    window.__onServerReady = () => {
        (async () => {
            const url = await window.ewvjs?.api?.getServerUrl?.();
            if (url) { setServerUrl(url); setMode('main'); }
        })();
    };

    const [settingsOpen, setSettingsOpen] = useState(false);

    return (
        <div className="desktop-shell">
            {mode === 'main' && (
                <TopBar onSettings={() => setSettingsOpen(true)} />
            )}
            <div className="shell-content">
                {mode === 'loading' && (
                    <div className="loading-screen">
                        <div className="loading-spinner" />
                        <p>加载中...</p>
                    </div>
                )}
                {mode === 'config' && (
                    <ConfigPage onSaved={() => {}} />
                )}
                {mode === 'main' && serverUrl && (
                    <iframe src={serverUrl} className="app-iframe" />
                )}
            </div>
            {settingsOpen && (
                <SettingsModal
                    onClose={() => setSettingsOpen(false)}
                />
            )}
        </div>
    );
}

function TopBar({ onSettings }: { onSettings: () => void }) {
    return (
        <div id="jm-desktop-bar">
            <span id="jm-bar-arrow" />
            <button className="jm-desktop-bar-btn" title="刷新" onClick={() => window.location.reload()}>🔄</button>
            <button className="jm-desktop-bar-btn" title="隐藏到托盘" onClick={() => window.ewvjs?.api?.hideToTray()?.catch(() => {})}>⬇</button>
            <button className="jm-desktop-bar-btn" title="设置" onClick={onSettings}>⚙</button>
            <button className="jm-desktop-bar-btn" title="打开配置文件夹" onClick={() => window.ewvjs?.api?.openConfigDir()?.catch(() => {})}>📋</button>
            <button className="jm-desktop-bar-btn" title="打开数据目录" onClick={() => window.ewvjs?.api?.openDataDir()?.catch(() => {})}>📁</button>
            <button className="jm-desktop-bar-btn" title="在浏览器中打开" onClick={() => window.ewvjs?.api?.openBrowser()?.catch(() => {})}>🌐</button>
            <button className="jm-desktop-bar-btn" title="重启应用" onClick={() => window.ewvjs?.api?.restartApp()?.catch(() => {})}>🔃</button>
        </div>
    );
}

function ConfigPage({ onSaved }: { onSaved: () => void }) {
    const [config, setConfig] = useState<Config>({});
    const [tab, setTab] = useState('basic');
    const [showPwd, setShowPwd] = useState(false);
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current) return;
        loaded.current = true;
        window.ewvjs?.api?.loadConfig().then(cfg => {
            if (cfg) setConfig(cfg);
        }).catch(() => {});
    }, []);

    const update = (k: string, v: unknown) => setConfig(prev => ({ ...prev, [k]: v }));

    const handleSave = async () => {
        const api = window.ewvjs?.api;
        if (!api) return;
        const r = await api.saveConfig(config);
        if (r?.ok) {
            await api.configSaved();
            onSaved();
        } else {
            alert(r?.message || '保存失败');
        }
    };

    const handleBrowseDir = async () => {
        const p = await window.ewvjs?.api?.browseDir?.(config.dataDir);
        if (p) update('dataDir', p);
    };

    const handleBrowseExe = async () => {
        const p = await window.ewvjs?.api?.browseFile?.(config.comicViewer);
        if (p) update('comicViewer', p);
    };

    return (
        <div className="config-page">
            <div className="config-header">
                <h1>JM漫画管理器</h1>
                <p>首次使用，请填写以下配置信息</p>
            </div>
            <div className="config-panel">
                <div className="config-tabs">
                    {['basic', 'network', 'advanced'].map(t => (
                        <div key={t} className={`config-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                            {t === 'basic' ? '基本设置' : t === 'network' ? '网络设置' : '高级设置'}
                        </div>
                    ))}
                </div>
                <div className="config-form">
                    {tab === 'basic' && (
                        <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>用户名 <span style={{ color: '#ef4444' }}>*</span></label>
                                    <input value={config.username || ''} onChange={e => update('username', e.target.value)} placeholder="输入 JM 账号" />
                                </div>
                                <div className="form-group">
                                    <label>密码 <span style={{ color: '#ef4444' }}>*</span></label>
                                    <div className="pwd-wrap">
                                        <input type={showPwd ? 'text' : 'password'} value={config.password || ''} onChange={e => update('password', e.target.value)} placeholder="输入 JM 密码" />
                                        <button className="pwd-toggle" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>{showPwd ? '\u{1F441}' : '\u{1F441}'}</button>
                                    </div>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>数据目录</label>
                                    <div className="browse-wrap">
                                        <input value={config.dataDir || ''} onChange={e => update('dataDir', e.target.value)} placeholder="如 D:\JM_Data" />
                                        <button className="btn-browse" onClick={handleBrowseDir} tabIndex={-1}>浏览</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>端口</label>
                                    <input type="number" value={config.port ?? 47310} onChange={e => update('port', Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group full">
                                    <label>漫画阅读器</label>
                                    <div className="browse-wrap">
                                        <input value={config.comicViewer || ''} onChange={e => update('comicViewer', e.target.value)} placeholder="C:\Program Files\..." />
                                        <button className="btn-browse" onClick={handleBrowseExe} tabIndex={-1}>浏览</button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {tab === 'network' && (
                        <>
                            <div className="form-group full" style={{ marginBottom: 14 }}>
                                <label>JM 主站</label>
                                <input value={config.host || 'https://18comic.vip'} onChange={e => update('host', e.target.value)} />
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>CDN 域名（每行一个）</label>
                                    <textarea value={(config.cdnHosts || []).join('\n')} onChange={e => update('cdnHosts', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} rows={4} />
                                </div>
                                <div className="form-group">
                                    <label>API 域名（每行一个）</label>
                                    <textarea value={(config.apiHosts || []).join('\n')} onChange={e => update('apiHosts', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} rows={4} />
                                </div>
                            </div>
                            <div className="form-group full">
                                <label>请求超时（ms）</label>
                                <input type="number" value={config.timeout ?? 86400000} onChange={e => update('timeout', Number(e.target.value))} />
                            </div>
                        </>
                    )}
                    {tab === 'advanced' && (
                        <div className="form-group full">
                            <label>调试模式</label>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={config.debug ?? false} onChange={e => update('debug', e.target.checked)} />
                                启用调试日志
                            </label>
                        </div>
                    )}
                </div>
                <div className="config-footer">
                    <button className="btn-save" onClick={handleSave}>保存配置</button>
                </div>
            </div>
        </div>
    );
}

function SettingsModal({ onClose }: { onClose: () => void }) {
    const [config, setConfig] = useState<Config>({});
    const [tab, setTab] = useState('basic');
    const [showPwd, setShowPwd] = useState(false);
    const loaded = useRef(false);

    useEffect(() => {
        if (loaded.current) return;
        loaded.current = true;
        window.ewvjs?.api?.loadConfig().then(cfg => {
            if (cfg) setConfig(cfg);
        }).catch(() => {});
    }, []);

    const update = (k: string, v: unknown) => setConfig(prev => ({ ...prev, [k]: v }));

    const handleSave = async () => {
        const api = window.ewvjs?.api;
        if (!api) return;
        const r = await api.saveConfig(config);
        if (r?.ok) {
            onClose();
        } else {
            alert(r?.message || '保存失败');
        }
    };

    const handleBrowseDir = async () => {
        const p = await window.ewvjs?.api?.browseDir?.(config.dataDir);
        if (p) update('dataDir', p);
    };

    const handleBrowseExe = async () => {
        const p = await window.ewvjs?.api?.browseFile?.(config.comicViewer);
        if (p) update('comicViewer', p);
    };

    return (
        <div className="settings-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="settings-modal">
                <div className="settings-tabs">
                    {['basic', 'network', 'advanced'].map(t => (
                        <div key={t} className={`settings-tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                            {t === 'basic' ? '基本设置' : t === 'network' ? '网络设置' : '高级设置'}
                        </div>
                    ))}
                </div>
                <div className="settings-form">
                    {tab === 'basic' && (
                        <>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>用户名</label>
                                    <input value={config.username || ''} onChange={e => update('username', e.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label>密码</label>
                                    <div className="pwd-wrap">
                                        <input type={showPwd ? 'text' : 'password'} value={config.password || ''} onChange={e => update('password', e.target.value)} />
                                        <button className="pwd-toggle" onClick={() => setShowPwd(!showPwd)} tabIndex={-1}>{showPwd ? '\u{1F441}' : '\u{1F441}'}</button>
                                    </div>
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group">
                                    <label>数据目录</label>
                                    <div className="browse-wrap">
                                        <input value={config.dataDir || ''} onChange={e => update('dataDir', e.target.value)} />
                                        <button className="btn-browse" onClick={handleBrowseDir} tabIndex={-1}>浏览</button>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label>端口</label>
                                    <input type="number" value={config.port ?? 47310} onChange={e => update('port', Number(e.target.value))} />
                                </div>
                            </div>
                            <div className="form-row">
                                <div className="form-group full">
                                    <label>漫画阅读器</label>
                                    <div className="browse-wrap">
                                        <input value={config.comicViewer || ''} onChange={e => update('comicViewer', e.target.value)} />
                                        <button className="btn-browse" onClick={handleBrowseExe} tabIndex={-1}>浏览</button>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                    {tab === 'network' && (
                        <>
                            <div className="form-group full" style={{ marginBottom: 14 }}>
                                <label>JM 主站</label>
                                <input value={config.host || 'https://18comic.vip'} onChange={e => update('host', e.target.value)} />
                            </div>
                            <div className="form-row" style={{ marginBottom: 0 }}>
                                <div className="form-group">
                                    <label>CDN 域名</label>
                                    <textarea value={(config.cdnHosts || []).join('\n')} onChange={e => update('cdnHosts', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} rows={4} />
                                </div>
                                <div className="form-group">
                                    <label>API 域名</label>
                                    <textarea value={(config.apiHosts || []).join('\n')} onChange={e => update('apiHosts', e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} rows={4} />
                                </div>
                            </div>
                        </>
                    )}
                    {tab === 'advanced' && (
                        <div className="form-group full">
                            <label>调试模式</label>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={config.debug ?? false} onChange={e => update('debug', e.target.checked)} />
                                启用调试日志
                            </label>
                        </div>
                    )}
                </div>
                <div className="settings-footer">
                    <button className="btn-quit" onClick={onClose}>取消</button>
                    <button className="btn-save" onClick={handleSave}>保存</button>
                </div>
            </div>
        </div>
    );
}

export default App;
