# 构建与发布（BUILD）

> 配套：[ARCHITECTURE.md](./ARCHITECTURE.md) ｜ [ROADMAP.md](./ROADMAP.md)
>
> 最后更新：2026-10-25（对应版本 1.0.2）

---

## 1. 环境要求

| 依赖 | 版本 | 用途 | 是否必须 |
|---|---|---|---|
| Node.js | 22.x | 构建、pkg 目标运行时 | ✅ 必须 |
| npm | 10.x+ | 依赖与 workspace 脚本 | ✅ 必须 |
| Inno Setup | 6.x | 编译 `.exe` 安装包 | 仅打安装包需要 |
| WebView2 运行时 | 任意近期版本 | 运行桌面端（Win10/11 一般自带） | 运行时需要 |

> 打包目标固定为 **windows x64 / node22**，因此构建必须在 Windows 上进行（或使用 windows runner 的 CI）。

---

## 2. 常用命令

在**仓库根目录**执行：

```bash
npm install              # 安装依赖（workspace 统一管理）

npm test                 # 跑单元/集成测试（7 个文件 / 62 用例）

npm run build:portable   # 构建免安装版（exe + zip），不需要 Inno Setup
npm run build:release    # 完整发布：web → core → exe → zip → 安装包

npm run check-version    # 校验各包版本号与根一致
npm run sync-version     # 把根版本号同步到各子包
```

### 单独构建某一层

```bash
npm run build:web        # 只构建前端（packages/web/dist）
npm run build:core       # 前端 + 引擎/服务端打包（packages/core/dist）
npm run build:desktop    # 只打 exe + zip（依赖 build:core 产物）
npm run build:installer  # 只编译安装包（依赖 build:desktop 产物）
```

---

## 3. 构建流程详解

`npm run build:release` 依次执行：

```
sync-version          版本号：根 package.json → 各子包
   ↓
check-version         校验一致性（不一致则失败）
   ↓
build:core            packages/core/build/build.mjs
   ├── buildEmbedWeb   构建 web 并内嵌为 web-embedded.json
   └── webpack ×2      产出 jm.core.js / jm.core.all.js
   ↓
build:desktop         packages/desktop/build/package.js
   ├── Step 1  预补丁 pkg 模板（图标 + VERSIONINFO）
   ├── Step 2  从 core/dist 自动同步 runtime bundle
   ├── Step 3  pkg 打包 exe
   ├── Step 4  复制 native / runtime / icon.ico
   ├── Step 5  子系统补丁为 GUI(2)
   ├── Step 6  生成 zip
   └── Step 7  校验产物（图标 / 版本 / 子系统 / 关键文件）
   ↓
build:installer       packages/desktop/build/make-installer.mjs
   └── 查找 ISCC.exe 并编译 setup.iss
```

### 产物位置

| 产物 | 路径 |
|---|---|
| 桌面 exe | `packages/desktop/dist/JM漫画管理器.exe` |
| 免安装 zip | `packages/desktop/dist/JM漫画管理器.zip` |
| 安装包 | `packages/desktop/installer/JM漫画管理器-Setup-<版本>.exe` |
| core 单文件 | `packages/core/dist/jm.core.exe` |
| core bundle | `packages/core/dist/jm.core.all.js`、`jm.core.js` |

---

## 4. 关键实现说明（踩过坑的地方）

### 4.1 图标与版本信息必须在 pkg 打包**之前**写入

pkg 会在模板末尾追加应用快照。若打包后用 resedit/rcedit 修改最终 exe，会**破坏或截断快照**，导致程序启动即退（实测过）。

因此 `package.js` 的 Step 1 先给 pkg 模板补图标与 VERSIONINFO，再让 pkg 基于该模板生成 exe。

Step 7 会校验：图标资源存在、`ProductName` 不是 `Node.js`、`FileVersion` 与 `package.json` 一致、子系统为 GUI(2)。

### 4.2 pkg 模板缺失时会自动下载

CI / 全新机器没有 `~/.pkg-cache`。`package.js` 会调用 `pkg-fetch` 的 `need({ forceFetch: true })`：

- **只下载预编译二进制，绝不触发源码编译**（编译需要 `patch` 命令 + VS 工具链，Windows 上必然失败）
- 下载地址：`https://github.com/yao-pkg/pkg-fetch/releases/download/v3.6/node-v22.22.3-win-x64`

> 注意：不要给 `need()` 传 `output` 参数——它是缓存**目录**，传错会生成 `fetched-xxx/` 目录而非文件。

### 4.3 runtime bundle 由脚本自动同步

`packages/desktop/runtime/jm.core.all.cjs` 是构建产物（**不在 git 中**），
由 `package.js` 的 Step 2 从 `packages/core/dist/jm.core.all.js` 自动复制。

**不要手工复制**，否则会出现"改了源码但 exe 行为没变"的版本漂移。

### 4.4 构建前会清理 dist

`package.js` 启动时清空 `packages/desktop/dist`，避免旧产物被一起打进 zip。

### 4.5 Inno Setup 路径可配置

`make-installer.mjs` 按以下顺序查找 `ISCC.exe`：

1. 环境变量 `ISCC_PATH`
2. `C:\Program Files (x86)\Inno Setup 6\ISCC.exe`
3. `C:\Program Files\Inno Setup 6\ISCC.exe`
4. Inno Setup 5 的对应路径

找不到时会给出明确提示，而不是抛出难以理解的 npm 错误。

---

## 5. 发布流程

### 5.1 本地手动发布

```bash
# 1. 改版本号（只改根 package.json 一处）
#    "version": "1.0.3"

# 2. 更新 CHANGELOG.md

# 3. 构建
npm run build:release

# 4. 提交并打 tag
git add -A
git commit -m "release: 1.0.3"
git tag -a 1.0.3 -m "1.0.3"
git push origin master 1.0.3
```

### 5.2 CI 自动发布

推送形如 `1.0.3` 的 tag 会触发 `.github/workflows/release.yml`：

```
checkout → setup node 22 → npm install → check-version → npm test
  → build:core → build:desktop → 安装 Inno Setup → build:installer
  → 收集 5 个资产 → 上传 artifact → 创建 GitHub Release
```

**固定 5 个发布资产**：

| 资产 | 来源 |
|---|---|
| `JM-Setup-<版本>.exe` | `packages/desktop/installer/` |
| `JM.zip` | `packages/desktop/dist/` |
| `jm.core.exe` | `packages/core/dist/` |
| `jm.core.all.js` | `packages/core/dist/` |
| `jm.core.js` | `packages/core/dist/` |

也可手动触发（`workflow_dispatch`），此时只上传 artifact，不创建 Release。

> **大文件上传注意**：本机代理会在 30MB 以上断连。CI 内网直连不受影响；
> 本地手动上传大文件时用 `curl --http1.1` 直连。

---

## 6. 常见问题

| 现象 | 原因 | 解决 |
|---|---|---|
| `未找到 pkg 模板` | 无 `~/.pkg-cache` 且下载失败 | 检查网络；或手动下载模板放到 `~/.pkg-cache/v3.6/` |
| `未找到 Inno Setup 编译器` | 未安装 ISCC | 安装 Inno Setup 6，或设 `ISCC_PATH`；也可用 `build:portable` 跳过 |
| exe 图标仍是 Node 默认图标 | 模板预补丁失败 | 看 Step 7 校验输出；确认 `icon.ico` 存在 |
| 改了源码但 exe 行为没变 | bundle 未重新生成 | 删 `packages/core/dist` 后重新 `build:core` |
| 打包后 `require('koffi')` 失败 | koffi 用动态 require 加载原生模块，pkg 抓不到 | 已知限制：托盘已移除；logger 的 koffi 失败会安全降级 |
| 桌面端关闭窗口后进程不退出 | `confirm_close: true` 会弹确认框 | 已改为 `false`（关窗即退出） |

---

## 7. 版本号规则

**唯一来源**：根 `package.json` 的 `version`。

构建时自动注入：

| 位置 | 注入方式 |
|---|---|
| 各子包 `package.json` | `scripts/sync-version.mjs` |
| 页面右上角显示 | web 的 Vite `define: __APP_VERSION__` |
| exe 的 VERSIONINFO | `package.js` 的 `patchTemplate` |
| 安装包文件名与属性 | `package.js` 生成 `version.iss`，`setup.iss` 引用 |

改版本号只需改根 `package.json` 一处，然后 `npm run sync-version`。
