# 架构说明（ARCHITECTURE）

> 本文描述 **当前工程实际是什么样**，以及 **目标架构应该是什么样**。
> 只做规划与记录，不代表已实施。实施进度见 [ROADMAP.md](./ROADMAP.md)。

- 文档基线版本：1.0.2
- 最后核对时间：2026-10-24

---

## 1. 一句话定位

> **本项目是一个 Windows 桌面应用：本地漫画的下载、整理与检索工具。**
>
> 爬虫是引擎，Web 是界面，桌面是唯一交付形态；CLI 保留为同一引擎的附属入口；编辑器插件不再存在。

后续任何新功能，都应能回答一个问题：**它属于引擎、界面，还是宿主？**

| 归属 | 判定标准 | 例子 |
|---|---|---|
| 引擎（engine） | 不依赖 UI、可被 CLI 与 HTTP 同时调用 | 抓取、解析、入库、任务调度 |
| 界面（app/web） | 只通过 HTTP/WS 与后端通信 | 页面、组件、状态 |
| 宿主（desktop） | 只做原生能力，不含业务逻辑 | 窗口、日志、单实例、安装包 |

---

## 2. 当前实际结构

```
jm-comic-manager/
├── packages/
│   ├── core/          # 引擎 + 服务端 + CLI（三者混在一起）
│   ├── web/           # Vue 3 SPA（界面）
│   ├── desktop/       # ewvjs 宿主壳 + React 配置页 + 打包脚本
│   ├── vscode/        # 已废弃的编辑器插件（产物名已对不上）
│   ├── taskbar-progress/  # 空壳目录，实际用的是同名 npm 包
│   └── build/         # 构建工具函数
├── resources/         # 图标、外部工具、反编译资料
├── test/              # 手工测试脚本（无测试框架）
├── build/             # 根级图标生成脚本
└── releases/          # 发布产物（已 gitignore）
```

### 2.1 各包实测体量

| 包 | 源文件数 | 代码行数 | 职责 | 问题 |
|---|---|---|---|---|
| `core` | 23（src+util） | 5,673 + 2,028 | 爬虫、解析、存储、服务端、CLI、任务 | 一个包扛四件事 |
| `web` | 43 | 10,382 | Vue SPA | 无 |
| `desktop` | 7 | 1,368 | 宿主 + 配置 UI | 配置 UI 写了两套 |
| `vscode` | 6 | 519 | 编辑器插件 | 引用了不存在的产物 |
| `taskbar-progress` | 0 | 0 | —— | 只剩 `build/` 目录 |

### 2.2 core 内部模块

| 文件 | 行数 | 说明 |
|---|---|---|
| `src/server.js` | 1,397 | **51 个路由**全在一个文件里 |
| `src/crawler.js` | 976 | 登录、下载、搜索、排行、论坛、推广 |
| `src/store.js` | 624 | SQLite 读写，**无 schema 版本/迁移机制** |
| `src/cli.js` | 522 | 15 个命令行子命令 |
| `src/protocol.js` | 479 | 常量 + 9 个数据类（**这 9 个类从未被 `new`**） |
| `src/taskManager.js` | 431 | 下载任务状态机 + 任务栏进度 |
| `src/message.js` | 301 | 控制台消息渲染（插件时代遗留） |
| `src/parser.js` | 524 | HTML 解析 |
| `src/mobile.js` | 197 | App 端接口签名/加解密 |
| `util/*` | 2,028 | 其中 4 个文件完全无引用 |

---

## 3. 当前架构的问题（按严重度）

### 3.1 交付形态混乱（最高优先）

**desktop 是一个 iframe 套壳**：
- React 应用（`App.tsx`，1,368 行）只做「顶栏 + `<iframe src=本地服务>` + 配置页」
- SPA 完全不知道自己在桌面端里，也不调用任何原生能力
- 结果：React 这一层只换来一条顶栏和一套配置表单

**配置 UI 写了两套**（同一个 `App.tsx` 内）：

| 位置 | 行号 | 用途 |
|---|---|---|
| `ConfigPage` | 121 | 首次启动配置 |
| `SettingsModal` | 301 | 运行期设置 |

两者字段重复（`username` / `password` / `dataDir` / `proxy` / `port` / `host` / `comicViewer` 等，共 14 处重复引用）。

**配置入口实际有三处**：
1. desktop `ConfigPage`（首启）
2. desktop `SettingsModal`（运行期）
3. web `SettingsDialog` —— **只能改「和谐模式」一个开关**

### 3.2 插件体系已经死亡，但代码还在

- `packages/vscode/src/extension.ts:18` 加载 `dist/jm.bundle.all.js`
- 而 core 现在只产出 `jm.core.js` / `jm.core.all.js`（见 `webpack.config*.js`）
- 磁盘上**不存在** `jm.bundle.all.js` —— 插件必然加载失败

插件时代还留下了：`message.js` 的控制台渲染、`config.js` 的 `ctx.event.on` 钩子、`index.js` 的 `enhanceMethods` 参数（**全仓库无任何调用方**）。

### 3.3 构建产物进了 git，且靠手工复制

- `packages/desktop/runtime/jm.core.all.cjs`（7.75 MB）被 git 跟踪
- 它是 `packages/core/dist/jm.core.all.js` 的副本，**但没有任何脚本负责复制**
- 每次发版都靠人手动 `Copy-Item`，极易漂移

### 3.4 仓库体积失控

| 指标 | 数值 |
|---|---|
| git 仓库 | 208 MB |
| 已跟踪文件 | 209 个 / 57.17 MB |
| 其中 `resources/` | 20 个文件 / **35.41 MB** |
| 其中 `packages/` | 143 个文件 / 17.25 MB |

可清理的跟踪内容合计约 **54 MB**（详见 ROADMAP P0）。

### 3.5 工程化缺失

| 项 | 现状 |
|---|---|
| CI | 无 `.github/` |
| 测试框架 | 无（`test/` 下 31 个手工脚本） |
| LICENSE | 无（README 声明 MIT） |
| 架构文档 | 无 `docs/` |
| 版本号 | **5 处手改**（4 个 `package.json` + `setup.iss`） |
| 依赖一致性 | 根 `express ^5.2.1`、core `express ^4.22.1`，实际装出两个版本 |

### 3.6 运行期隐患

| 项 | 现状 |
|---|---|
| 监听地址 | `server.js:58` 硬编码 `0.0.0.0`，局域网可访问，且**无任何鉴权** |
| `/file` 代理 | 按 `originUrl` 参数抓取任意 http 地址并落盘（SSRF 面） |
| 日志 | 单文件追加，无轮转（实测已达 852 MB） |
| 密钥 | `password` / `token` 明文存 `config.json` |
| 首启配置 | `desktop/runtime/config.json` 写死 `F:\jm`（开发机路径） |
| DB 迁移 | 仅 `CREATE TABLE IF NOT EXISTS` + `try ALTER`，无版本号 |

### 3.7 死代码与未使用依赖

**完全无引用的 util**：`lanzou.js`(407) / `aria2.js`(125) / `cache.js`(48) / `cookie.js`(101)

**core 未使用依赖（逐个验证 0 引用）**：
`@agentine/herald`、`@libsql/client`、`abort-controller`、`better-sqlite3`、`fdir`、`supports-color`、`tunnel`、`typescript`、`undici`

**未使用文件**：`packages/build/jm.bundle.jpg`、`test/fetchInfo.json`(4.4 MB)、`resources/icon.bak/`(4.5 MB)、`resources/jm/.tools/apktool.jar`(23 MB)

---

## 4. 目标架构

### 4.1 分层

```
┌──────────────────────────────────────────────────────┐
│  desktop（宿主壳，目标 < 600 行）                      │
│  窗口 / 日志 / 单实例 / 开机自启 / 自动更新             │
│  只做原生能力，不含业务 UI                              │
└────────────────────┬─────────────────────────────────┘
                     │ create_window 直接指向本地服务
┌────────────────────▼─────────────────────────────────┐
│  app（Vue SPA，唯一 UI）                              │
│  页面 / 组件 / 首启引导(/setup) / 设置                  │
└────────────────────┬─────────────────────────────────┘
                     │ HTTP / WS（同源）
┌────────────────────▼─────────────────────────────────┐
│  server（薄适配层）                                    │
│  routes/ 按领域拆分，只做参数校验与编排                  │
└────────────────────┬─────────────────────────────────┘
┌────────────────────▼─────────────────────────────────┐
│  engine（纯 Node，零 UI 依赖）                         │
│  crawler / parser / store / tasks / config            │
└────────────────────▲─────────────────────────────────┘
                     │
              cli（同一 engine 的批处理入口）
```

### 4.2 依赖规则（建议写进 lint / CI 检查）

1. `engine` **不得** `require('express')`，不得感知 web / desktop
2. `server` 只依赖 `engine` 的公开接口，不直接操作数据库文件
3. `app` 只通过 HTTP/WS 通信，**不得** import engine
4. `desktop` 不写业务逻辑，只暴露 `window.ewvjs.api`
5. 禁止跨包引用 `src/` 内部实现（只允许包入口）

### 4.3 目标目录

```
packages/
  engine/                 # ← 现 core 的引擎部分
    src/
      crawler/            # 拆分 crawler.js (976)
      parser/             # 拆分 parser.js (524)
      store/              # 拆分 store.js (624) + migrations/
      tasks/              # 拆分 taskManager.js (431)
      config/
      protocol.js         # 只保留 PHASE / STEP / STATE / ERR / ApiPath
  server/
    routes/               # comics / rank / account / favorites /
                          # forum / tasks / settings / static
    index.js
  app/                    # ← 现 web
    src/{pages,components,stores,router}/
  desktop/
    main.js               # 宿主：窗口 / 日志 / 单实例
    build/                # 打包（pkg + Inno Setup）
  cli/
docs/                     # 架构 / 路线 / 发布流程
```

### 4.4 配置单一来源

一份 schema 描述所有配置项（字段、类型、默认值、是否敏感、是否需重启），三处统一从它渲染：

```
config/schema.js
   ├── desktop 首启引导
   ├── app 设置页
   └── cli config 命令
```

### 4.5 版本号单一来源

根 `package.json` 一处定义，构建时注入：
- `setup.iss` 的 `MyAppVersion`
- web 的 `__APP_VERSION__`
- exe 的 VERSIONINFO

（现状：5 处手改）

---

## 5. 明确不做的事

| 不做 | 原因 |
|---|---|
| 把 engine 拆成多个 npm 包 | 个人项目，workspace 内 3 个包足够 |
| 重写前端框架 | Vue 3 + Naive UI 没有问题，只做去重与收口 |
| 恢复 vscode 插件 | 历史包袱，且已失效 |
| 引入 ORM | `node:sqlite` + 手写 SQL 已足够，补迁移机制即可 |
| 追求测试覆盖率 | 只测"会算错"的地方 |

---

## 6. 术语表

| 术语 | 含义 |
|---|---|
| engine | 纯逻辑层：抓取、解析、存储、任务 |
| 宿主（host） | 提供窗口与系统能力的壳 |
| SPA | 单页应用（`packages/web`） |
| 关联表 | `comic_meta_tag` / `comic_meta_author` / `comic_work` / `comic_meta_actor` |
| 首启引导 | 第一次运行时引导用户配置数据目录、账号等的流程 |
