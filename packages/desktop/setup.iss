; ========= 基础配置 =========
; 版本号由 build/package.js 在打包前写入 version.iss（唯一来源：根 package.json）
#define MyAppName "JM漫画管理器"
#include "version.iss"
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
; 注意：Inno Setup 官方安装包【不附带】简体中文语言文件，它是社区翻译
; （https://jrsoftware.org/files/istrans/）。CI 与未手动装过该语言包的机器上
; 直接用 "compiler:Languages\ChineseSimplified.isl" 会报 "Couldn't open include file"。
; 因此把该文件随仓库一起提供，这里用相对路径引用。
Name: "chinesesimplified"; MessagesFile: "build\languages\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

; ========= 文件打包 =========
; 前端已内嵌进 exe（core 的 web-embedded.json），不再需要 assets/index.html/favicon.svg
[Files]
Source: "{#BuildDir}\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDir}\icon.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "{#BuildDir}\runtime\*"; DestDir: "{app}\runtime"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BuildDir}\native\*"; DestDir: "{app}\native"; Flags: ignoreversion recursesubdirs createallsubdirs
; ewvjs 注入页面的 API 脚本：exe 被打成单文件 bundle 后，ewvjs 按 exe 同目录的
; js\api.js 读取。漏了它会导致安装版启动即崩（打包版能跑、装完不能跑）。
Source: "{#BuildDir}\js\*"; DestDir: "{app}\js"; Flags: ignoreversion recursesubdirs createallsubdirs

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