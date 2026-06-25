const { execFile } = require('child_process');

function setTaskbarByPs(state = 'normal', value = 0) {
    if (process.platform !== 'win32') return;

    const flag = {
        none: 0,
        indeterminate: 1,
        normal: 2,
        error: 4,
        paused: 8
    };

    const ps = `
Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;
public class Win32 {
  [DllImport("user32.dll")]
  public static extern IntPtr GetConsoleWindow();

  [Guid("ea1afb91-9bce-4a6a-9a1d-5a6b5c8c4a1e"), InterfaceType(1)]
  public interface ITaskbarList3 {
    void HrInit();
    void SetProgressState(IntPtr hwnd, uint state);
    void SetProgressValue(IntPtr hwnd, ulong completed, ulong total);
  }

  [ComImport, Guid("56fdf344-fd6c-11d0-958a-006097c9a090")]
  public class TaskbarInstance {}
}
"@

$hwnd = [Win32]::GetConsoleWindow()
if (-not $hwnd) { exit }

$t = New-Object Win32+TaskbarInstance
$tlb = $t -as [Win32+ITaskbarList3]
$tlb.HrInit()

$state = ${stateVal}
if ($state -eq 0) {
  $tlb.SetProgressState($hwnd, 0)
} else {
  $tlb.SetProgressState($hwnd, ${stateVal})
  $tlb.SetProgressValue($hwnd, ${val}, 100)
}
`;

    execFile(
        'powershell.exe',
        [
            '-NoProfile',
            '-NonInteractive',
            '-Command',
            ps
                .replace(/\$\{stateVal\}/g, flag[state])
                .replace(/\$\{val\}/g, Math.round(value))
        ],
        { windowsHide: true },
        (err) => err && console.error('ps taskbar err:', err.message)
    );
}

// 测试
setTaskbarByPs('indeterminate');
setTimeout(() => {
    setTaskbarByPs('normal', 45);
}, 2000);
setTimeout(() => {
    setTaskbarByPs('none');
}, 5000);
