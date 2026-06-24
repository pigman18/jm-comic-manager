const { execFile } = require('child_process');
const path = require('path');

/**
 * 设置当前进程的任务栏进度条状态
 * @param {'none'|'indeterminate'|'normal'|'error'|'paused'} state
 * @param {number} value 0-100 (仅 normal 有效)
 */
function setTaskbarProgress(state = 'normal', value = 0) {
    // 映射 Windows TBPFLAG 枚举
    const flagMap = {
        none: 0,          // TBPF_NOPROGRESS
        indeterminate: 1, // TBPF_INDETERMINATE (无限循环)
        normal: 2,         // TBPF_NORMAL
        error: 4,          // TBPF_ERROR
        paused: 8          // TBPF_PAUSED
    };

    // 注意：PowerShell 的进度控制通常作用于窗口句柄。
    // 纯 Node 控制台窗口(ConHost)对 Taskbar Progress 支持有限（Win10/11 部分版本支持纯 exe 进度），
    // 如果是 GUI 包装的 Node (如 Electron/NW.js)，此方法最稳。
    // 如果是纯控制台 exe，Windows 有时会识别，有时不会（取决于是否分配了 HWND）。

    // 通用方案：调用 Windows API 的 COM 组件 (需窗口宿主)
    const psScript = `
        $code = @'
        using System;
        using System.Runtime.InteropServices;
        public class Win32 {
            [DllImport("user32.dll")]
            public static extern IntPtr GetConsoleWindow();
            // 注：完整实现需要引用 shell32.dll 的 ITaskbarList3
            // 这里演示概念，纯 PS 调 COM 较繁琐，建议用 addon 或 accept limitation
        }
'@
        # 实际上最稳的纯脚本做法是利用 Windows 自带的 explorer 接口或接受限制
        # 对于 pkg 打包的 GUI 壳，通常由壳负责（Electron 自带 setProgressBar）
        Write-Host "Progress: ${state} ${value}"
    `;

    // 由于纯 Node 控制台限制，最推荐的“无依赖”实现是：
    // 如果你的应用有窗口（哪怕隐藏），用 node-gyp 编一个小 addon
    // 如果只是控制台工具，Windows Terminal 等现代终端本身支持通过 VT 序列在标题栏显示文本进度
}

// 模拟进度
setTaskbarProgress('normal', 50);
setTimeout(() => setTaskbarProgress('none'), 2000);