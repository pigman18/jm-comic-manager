'use strict';

const koffi = require('koffi');
const path = require('path');

const user32 = koffi.load('user32.dll');
const shell32 = koffi.load('shell32.dll');

// --- Structs ---

const NOTIFYICONDATAW = koffi.struct('TRAY_NID', {
    cbSize: 'unsigned int',
    _a1: 'unsigned int',
    hWnd: 'void *',
    uID: 'unsigned int',
    uFlags: 'unsigned int',
    uCallbackMessage: 'unsigned int',
    _a2: 'unsigned int',
    hIcon: 'void *',
    szTip: 'char16_t[128]',
});

// WNDCLASSEXW layout on x64: 4+4+8+4+4+8+8+8+8+8+8+8 = 80
const WNDCLASSEXW = koffi.struct('TRAY_WCX', {
    cbSize: 'unsigned int',
    style: 'unsigned int',
    lpfnWndProc: 'void *',
    cbClsExtra: 'int',
    cbWndExtra: 'int',
    hInstance: 'void *',
    hIcon: 'void *',
    hCursor: 'void *',
    hbrBackground: 'void *',
    lpszMenuName: 'void *',
    lpszClassName: 'void *',
    hIconSm: 'void *',
});

// --- Callback type ---
const WNDPROC_CB = koffi.pointer(koffi.proto('long TRAY_WNDPROC(void *hwnd, unsigned int msg, void *wparam, void *lparam)'));

// --- DLL functions ---

const RegisterClassExW = user32.func('unsigned short RegisterClassExW(TRAY_WCX *wc)');
const CreateWindowExW = user32.func('void *CreateWindowExW(unsigned int exStyle, str16 className, str16 windowName, unsigned int style, int x, int y, int w, int h, void *parent, void *menu, void *instance, void *param)');
const DefWindowProcW = user32.func('long DefWindowProcW(void *hwnd, unsigned int msg, void *wparam, void *lparam)');
const PeekMessageW = user32.func('int PeekMessageW(void *msg, void *hwnd, unsigned int filterMin, unsigned int filterMax, unsigned int removeMsg)');
const TranslateMessage = user32.func('int TranslateMessage(void *msg)');
const DispatchMessageW = user32.func('long DispatchMessageW(void *msg)');
const DestroyWindow = user32.func('int DestroyWindow(void *hwnd)');
const CreatePopupMenu = user32.func('void *CreatePopupMenu()');
const AppendMenuW = user32.func('int AppendMenuW(void *menu, unsigned int flags, void *id, void *item)');
const TrackPopupMenu = user32.func('int TrackPopupMenu(void *menu, unsigned int flags, int x, int y, int reserved, void *hwnd, void *rect)');
const DestroyMenu = user32.func('int DestroyMenu(void *menu)');
const LoadImageW = user32.func('void *LoadImageW(void *instance, void *name, unsigned int type, int cx, int cy, unsigned int loadFlags)');
const DestroyIcon = user32.func('int DestroyIcon(void *icon)');
const GetCursorPos = user32.func('int GetCursorPos(void *pt)');
const SetForegroundWindow = user32.func('int SetForegroundWindow(void *hwnd)');
const MessageBoxW = user32.func('int MessageBoxW(void *hwnd, str16 text, str16 caption, unsigned int type)');
const Shell_NotifyIconW = shell32.func('int Shell_NotifyIconW(unsigned int cmd, TRAY_NID *data)');

// --- Constants ---

const WS_POPUP = 0x80000000;
const WS_EX_TOOLWINDOW = 0x00000080;
const WM_APP = 0x8000;
const WM_DESTROY = 0x0002;
const WM_COMMAND = 0x0111;
const WM_LBUTTONDBLCLK = 0x0203;
const WM_RBUTTONUP = 0x0205;
const NIM_ADD = 0;
const NIM_DELETE = 2;
const NIF_MESSAGE = 1;
const NIF_ICON = 2;
const NIF_TIP = 4;
const TPM_RETURNCMD = 0x0100;
const TPM_RIGHTBUTTON = 0x0002;
const IMAGE_ICON = 1;
const LR_LOADFROMFILE = 0x0010;
const MF_STRING = 0;
const MF_SEPARATOR = 0x0800;
const WM_TRAYICON = WM_APP + 1;
const ID_TRAY_FIRST = 1000;

// --- State ---

let _hWnd = null;
let _hIcon = null;
let _pumpTimer = null;
let _onClicked = null;
let _onExit = null;
let _menuItems = [];
let _wndProcCallback = null;
let _nid = null;

// --- Window Procedure ---

function wndProc(hwnd, msg, wparam, lparam) {
    const m = Number(msg);
    if (m === WM_TRAYICON) {
        const l = Number(lparam);
        if (l === WM_RBUTTONUP) {
            showContextMenu(hwnd);
        } else if (l === WM_LBUTTONDBLCLK) {
            _onClicked?.('toggle');
        }
        return 0;
    }
    if (m === WM_COMMAND) {
        const id = Number(wparam);
        for (const item of _menuItems) {
            if (item.id === id) {
                _onClicked?.(item.action);
                break;
            }
        }
        return 0;
    }
    return DefWindowProcW(hwnd, msg, wparam, lparam);
}

function showContextMenu(hwnd) {
    const ptBuf = Buffer.alloc(8);
    GetCursorPos(ptBuf);
    const cx = ptBuf.readInt32LE(0);
    const cy = ptBuf.readInt32LE(4);

    const hm = CreatePopupMenu();
    if (!hm) return;

    for (const item of _menuItems) {
        if (item.separator) {
            AppendMenuW(hm, MF_SEPARATOR, null, null);
        } else {
            const itemTitleBuf = Buffer.from(item.title + '\0', 'ucs2');
            AppendMenuW(hm, MF_STRING, koffi.as(item.id, 'void *'), itemTitleBuf);
        }
    }

    SetForegroundWindow(hwnd);
    const cmd = TrackPopupMenu(hm, TPM_RETURNCMD | TPM_RIGHTBUTTON, cx, cy, 0, hwnd, null);
    if (cmd > 0) {
        for (const item of _menuItems) {
            if (item.id === cmd) {
                _onClicked?.(item.action);
                break;
            }
        }
    }
    DestroyMenu(hm);
}

function pumpMessages() {
    const m = Buffer.alloc(48);
    while (PeekMessageW(m, null, 0, 0, 1)) {
        TranslateMessage(m);
        DispatchMessageW(m);
    }
}

// --- Public API ---

function createTray(options) {
    const { icon, tooltip, menu, onClicked, onReady, onExit } = options;
    _onClicked = onClicked;
    _onExit = onExit;

    _menuItems = [];
    let nextId = ID_TRAY_FIRST;
    for (const item of menu) {
        if (item.separator) {
            _menuItems.push({ separator: true, id: 0, action: null });
        } else {
            _menuItems.push({ separator: false, id: nextId, title: item.title, action: item.id });
            nextId++;
        }
    }

    // Register window class
    const className = 'JmTrayCls';
    const clsNameBuf = Buffer.from(className + '\0', 'ucs2');
    _wndProcCallback = koffi.register(wndProc, WNDPROC_CB);

    const wc = {
        cbSize: koffi.sizeof(WNDCLASSEXW),
        style: 0,
        lpfnWndProc: _wndProcCallback,
        cbClsExtra: 0,
        cbWndExtra: 0,
        hInstance: null,
        hIcon: null,
        hCursor: null,
        hbrBackground: null,
        lpszMenuName: null,
        lpszClassName: clsNameBuf,
        hIconSm: null,
    };

    const atom = RegisterClassExW(wc);
    if (!atom) throw new Error('RegisterClassExW failed');

    // Create hidden window
    const hwnd = CreateWindowExW(
        WS_EX_TOOLWINDOW,
        className,
        '',
        WS_POPUP,
        0, 0, 0, 0,
        null, null, null, null
    );
    if (!hwnd) throw new Error('CreateWindowExW failed');
    _hWnd = hwnd;

    // Load icon
    const iconPath = path.resolve(icon);
    const iconPathBuf = Buffer.from(iconPath + '\0', 'ucs2');
    const hIcon = LoadImageW(null, iconPathBuf, IMAGE_ICON, 32, 32, LR_LOADFROMFILE);
    if (!hIcon) throw new Error('LoadImageW failed: ' + iconPath);
    _hIcon = hIcon;

    // Add tray icon
    const tipBuf = Buffer.from((tooltip || '') + '\0'.repeat(128), 'ucs2').subarray(0, 256);
    _nid = {
        cbSize: koffi.sizeof(NOTIFYICONDATAW),
        _a1: 0,
        hWnd: hwnd,
        uID: 1,
        uFlags: NIF_MESSAGE | NIF_ICON | NIF_TIP,
        uCallbackMessage: WM_TRAYICON,
        _a2: 0,
        hIcon: hIcon,
        szTip: tipBuf,
    };

    if (!Shell_NotifyIconW(NIM_ADD, _nid)) {
        DestroyWindow(hwnd);
        DestroyIcon(hIcon);
        throw new Error('Shell_NotifyIconW NIM_ADD failed');
    }

    // Start message pump
    _pumpTimer = setInterval(pumpMessages, 30);

    onReady?.();

    function setMenu(menu) {
        _menuItems = [];
        let nextId = ID_TRAY_FIRST;
        for (const item of menu) {
            if (item.separator) {
                _menuItems.push({ separator: true, id: 0, action: null });
            } else {
                _menuItems.push({ separator: false, id: nextId, title: item.title, action: item.id });
                nextId++;
            }
        }
    }

    return {
        close() {
            if (_pumpTimer) {
                clearInterval(_pumpTimer);
                _pumpTimer = null;
            }
            if (_hWnd && _nid) {
                Shell_NotifyIconW(NIM_DELETE, _nid);
                DestroyWindow(_hWnd);
                _hWnd = null;
            }
            if (_hIcon) {
                DestroyIcon(_hIcon);
                _hIcon = null;
            }
            _onExit?.();
        },
        setMenu,
    };
}

function showConfirm(text, caption) {
    const MB_YESNO = 0x04;
    const MB_ICONQUESTION = 0x20;
    const MB_TOPMOST = 0x40000;
    return MessageBoxW(null, text, caption, MB_YESNO | MB_ICONQUESTION | MB_TOPMOST) === 6; // IDYES
}

module.exports = { createTray, showConfirm };
