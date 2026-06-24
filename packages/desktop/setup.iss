; ========= 基础配置 =========
#define MyAppName "JM漫画管理器"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "pigman18"
#define MyAppExeName "JM漫画管理器.exe"
#define ToastAppId "com.pigman18.jmcomicmanager"
#define BuildDir "dist"

[Setup]
AppId={{A1B2C3D4-E5F6-7890-ABCD-1234567890EF}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
SetupIconFile=icon.ico
OutputDir=installer
OutputBaseFilename={#MyAppName}-Setup-{#MyAppVersion}
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

; ========= 文件打包 =========
[Files]
Source: "{#BuildDir}\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDir}\native\*"; DestDir: "{app}\native"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BuildDir}\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BuildDir}\index.html"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDir}\favicon.svg"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDir}\icons.svg"; DestDir: "{app}"; Flags: ignoreversion

; ========= 快捷方式（关键：绑定 AppId）=========
[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; AppUserModelID: "{#ToastAppId}"
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; AppUserModelID: "{#ToastAppId}"
Name: "{group}\卸载 {#MyAppName}"; Filename: "{uninstallexe}"

; ========= 注册表（关键：告诉 Windows 这个 AppId 叫什么名字）=========
[Registry]
; 允许通知
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Notifications\Settings\{#ToastAppId}"; ValueName: "Enabled"; ValueType: dword; ValueData: 1; Flags: uninsdeletekey
; 设置通知显示名称（解决标题显示为 AppId 的问题）
Root: HKCU; Subkey: "Software\Classes\AppUserModelId\{#ToastAppId}"; ValueName: ""; ValueType: string; ValueData: "{#MyAppName}"; Flags: uninsdeletekey
; 设置通知图标
Root: HKCU; Subkey: "Software\Classes\AppUserModelId\{#ToastAppId}"; ValueName: "IconUri"; ValueType: string; ValueData: "{app}\{#MyAppExeName},0"; Flags: uninsdeletekey

; ========= 安装后运行 =========
[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "启动 {#MyAppName}"; Flags: nowait postinstall skipifsilent