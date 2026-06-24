# Method 2: C# NotifyIcon + Application.Run() (proper WinForms message loop)
$title = '✅ 下载完成'
$msg = 'test comic name'

Add-Type -ReferencedAssemblies System.Windows.Forms,System.Drawing -TypeDefinition @"
using System;
using System.Windows.Forms;
using System.Drawing;
public class ToastHelper {
    public static void Show(string title, string text) {
        var ni = new NotifyIcon();
        try { ni.Icon = Icon.ExtractAssociatedIcon(Environment.GetCommandLineArgs()[0]); }
        catch { ni.Icon = SystemIcons.Information; }
        ni.BalloonTipTitle = title;
        ni.BalloonTipText = text;
        ni.Visible = true;
        ni.ShowBalloonTip(5000);
        var timer = new Timer();
        timer.Interval = 5000;
        timer.Tick += (s, e) => { ni.Dispose(); timer.Stop(); Application.ExitThread(); };
        timer.Start();
        Application.Run();
    }
}
"@
[ToastHelper]::Show($title, $msg)
Write-Output "done"
