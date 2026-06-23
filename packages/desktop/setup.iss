; ========= 基础配置 =========
#define MyAppName "JM漫画管理器"
#define MyAppVersion "1.0.0"
#define MyAppPublisher "pigman18"
#define MyAppExeName "JM漫画管理器.exe"

; 主程序所在目录（ewvjs 打包输出目录，相对脚本位置）
#define BuildDir "dist"

[Setup]
; 基本信息
AppId={{A1B2C3D4-E5F6-7890-ABCD-1234567890EF}  ; 用 Inno 菜单生成一个新的 GUID
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppPublisher={#MyAppPublisher}
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
AllowNoIcons=yes
SetupIconFile=icon.ico
; 输出配置
OutputDir=installer
OutputBaseFilename={#MyAppName}-Setup-{#MyAppVersion}
; 压缩（体积小）
Compression=lzma2/ultra64
SolidCompression=yes
WizardStyle=modern
; 图标（可选，安装向导图标）
; SetupIconFile=icon.ico

[Languages]
Name: "chinesesimplified"; MessagesFile: "compiler:Languages\ChineseSimplified.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

; ========= 文件打包（核心）=========
[Files]
; 1. 主程序 exe
Source: "{#BuildDir}\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion

; 2. native 依赖文件夹（ewvjs 必须的）
; 如果 ewvjs 打包后有 native 文件夹，一定要加这行
Source: "{#BuildDir}\native\*"; DestDir: "{app}\native"; Flags: ignoreversion recursesubdirs createallsubdirs

; 3. 其他资源（assets/其他文件）
; 根据实际情况添加，没有就删掉
Source: "{#BuildDir}\assets\*"; DestDir: "{app}\assets"; Flags: ignoreversion recursesubdirs createallsubdirs

; 如果有其他散装文件（如 config.json, index.html）
Source: "{#BuildDir}\index.html"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BuildDir}\favicon.svg"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: "{#BuildDir}\icons.svg"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs

; ========= 快捷方式 =========
[Icons]
; 开始菜单
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; 
; 桌面图标（可选）
Name: "{commondesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon; 
; 卸载
Name: "{group}\卸载 {#MyAppName}"; Filename: "{uninstallexe}"


; ========= 安装后运行 =========
[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "启动 {#MyAppName}"; Flags: nowait postinstall skipifsilent
