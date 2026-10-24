# 路线图（ROADMAP）

> 配套文档：[ARCHITECTURE.md](./ARCHITECTURE.md)
> 本文是**计划**，未开始实施。每完成一项把 `[ ]` 改为 `[x]`，并记录实际耗时。
>
> 基线版本：1.0.2 ｜ 最后更新：2026-10-24

---

## 0. 目标与验收总纲

| 目标 | 验收标准 |
|---|---|
| 仓库瘦身 | 已跟踪体积 57.17 MB → **< 12 MB** |
| 交付形态收口 | 桌面端只有**一套**配置 UI，无 iframe 套壳 |
| 构建可重复 | 一条命令产出 exe + 安装包，**无手工复制步骤** |
| 版本一致 | 版本号只在**一处**定义 |
| 服务端可维护 | `server.js` 1,397 行 → 每文件 **< 250 行** |
| 数据安全 | DB 有版本号与迁移机制，升级不靠"碰运气" |

---

## 需要先拍板的两个决策

| # | 决策点 | 选项 | 建议 |
|---|---|---|---|
| D1 | 桌面壳方案 | **A**：删掉 React，`create_window` 直接指向本地服务，SPA 用 `window.ewvjs.api` 调原生能力<br>**B**：保留 React 壳，但删掉 `ConfigPage`/`SettingsModal` 重复实现 | **A** —— 能删掉 1,368 行 + React 全家桶 + iframe |
| D2 | CLI 去留 | **A**：保留为批处理附属入口（`album:download:batch` 等有实用价值）<br>**B**：完全砍掉，只留桌面 | **A** —— 它是引擎能力的低成本出口 |

> D1 选 A 会改变首启流程（配置页从 desktop 搬到 SPA 的 `/setup` 路由），建议先做 P0、P2 中与 D1 无关的部分。

---

## P0 · 清理（预计 0.5–1 天，零功能风险）

目标：不改任何逻辑，只删东西。完成后仓库体积与认知负担立刻下降。

### P0-1 删除废弃包

- [x] 删除 `packages/vscode/`（引用了不存在的 `dist/jm.bundle.all.js`，必然加载失败）
- [x] 删除 `packages/taskbar-progress/`（目录内只剩 `build/`，实际用的是 npm 上的同名包）
- [x] 从根 `package.json` 的 `workspaces` 中移除上述两项

### P0-2 删除死代码

- [x] `packages/core/util/lanzou.js`（407 行，0 引用）
- [x] `packages/core/util/aria2.js`（125 行，0 引用）
- [x] `packages/core/util/cache.js`（48 行，0 引用）
- [x] `packages/core/util/cookie.js`（101 行，0 引用）
- [x] `packages/core/src/protocol.js` 中 9 个从未被 `new` 的数据类
      （`JmMeta` / `JmSearchMeta` / `JmWeekCategory` / `JmWeekType` / `JmWeekInfo` /
      `JmSubCategory` / `JmCategoryItem` / `JmBlockItem` / `JmCategoryInfo`）
      保留 `PHASE` / `STEP` / `STATE` / `ERR` / `ApiPath` / `SearchSort`

### P0-3 删除死接口

- [x] `server.js` 的 `handleJmConfig`（`POST /api/jm-config`）：`manifest.config` 为 `undefined`，白名单永远为空
- [x] `server.js` 的 `handleBrowse`（`POST /api/browse-dir`、`POST /api/browse-file`）：web 端 0 调用；桌面端已有原生对话框
- [x] `index.js` 的 `enhanceMethods` 参数（全仓库无调用方）

### P0-4 清理未使用依赖（core）

逐个验证过 0 引用，删除后需重新 `npm install` 并跑一次完整构建：

- [x] `@agentine/herald`
- [x] `@libsql/client`
- [x] `abort-controller`
- [x] `better-sqlite3`
- [x] `fdir`
- [x] `supports-color`
- [x] `tunnel`
- [x] `typescript`（core 无 TS 源码）
- [x] `undici`

### P0-5 清理大文件（约 54 MB）

| 文件 | 大小 | 处理 |
|---|---|---|
| `resources/jm/.tools/apktool.jar` | 23.25 MB | 删除（反编译资料，0 引用） |
| `resources/jm-api/JMComic3v2.0.25.apk` | 28.12 MB | 已在 gitignore，确认未跟踪 |
| `resources/ComicsViewer_3.08/`（exe+dll） | 6.81 MB | 删除（0 引用） |
| `packages/vscode/vscode-jm-bundle-1.0.0.vsix` | 5.29 MB | 随 P0-1 删除 |
| `test/fetchInfo.json` | 4.45 MB | 删除（一次性调试数据） |
| `resources/icon.bak/`（5 个文件） | 4.53 MB | 删除 |
| `packages/desktop/runtime/jm.core.all.cjs` | 7.75 MB | 停止跟踪，改由构建生成（见 P3） |
| `resources/icon.png` + `icon.svg` | 2.03 MB | 只保留 `icon.ico`；svg/png 移到构建脚本按需生成 |
| `packages/desktop/public/{favicon,icons}.svg` | 2.03 MB | 与 `resources/icon.svg` **内容完全相同**，改为构建时复制一份 |
| `packages/build/jm.bundle.jpg` | 0.71 MB | 删除（0 引用） |
| `resources/jm/decompile-apk.{bat,ps1}` | 0.02 MB | 移到 `docs/tools/` 或删除 |

- [x] 完成上表清理
- [x] 校验：`git ls-files | xargs du` 总计 < 12 MB

### P0-6 补齐基础文件

- [x] 新增 `LICENSE`（MIT，README 已声明但无文件）
- [x] 新增 `.github/workflows/`（CI 见 P3）
- [x] 把根目录散落文档归位：
      `AGENTS.md` / `禁止规则.md` / `优先参照.md` / `vue-router-pagination-bug-record.md` / `jm-api.md`

> **P0 验收**：`npm run build` 通过；桌面端能启动、能下载、能本地检索；
> 仓库已跟踪体积 < 12 MB。

---

## P1 · 收口交付形态（预计 3–5 天）

> 依赖 D1 决策。若 D1 选 B，本阶段只做 P1-2 / P1-3。

### P1-1 去掉 React 套壳（D1=A）

- [x] `create_window` 的 URL 从 `dist/index.html` 改为 `http://127.0.0.1:{port}/index.html`
- [x] SPA 内新增 `/setup` 路由（首启引导：数据目录、账号、端口）
- [x] SPA 通过 `window.ewvjs.api` 调用：`browseDir` / `browseFile` / `openDataDir` / `openConfigDir` / `openBrowser` / `restartApp` / `hideToTray`
- [x] 删除 `packages/desktop/src/`（React 全部）与相关依赖：`react` / `react-dom` / `marked` / `@vitejs/plugin-react` / `tsc` 构建链
- [x] `/setup` 完成前**不得**初始化数据库（避免半配置状态建库）

### P1-2 配置单一来源

- [x] 定义 `config/schema.js`：字段、类型、默认值、是否敏感、是否需重启
- [x] desktop 引导、web 设置页、CLI `config` 命令三处统一从 schema 渲染
- [x] web `SettingsDialog` 从"只能改和谐模式"扩展为完整设置（或明确拆分：桌面管基础、网页管界面偏好）

### P1-3 首启与路径

- [x] `desktop/runtime/config.json` 中的 `F:\jm` 改为空/占位，由用户首次选择
- [x] 首次运行若未选数据目录，弹引导而不是默默用默认路径

### P1-4 版本号单一来源

- [x] 版本号只在根 `package.json` 定义
- [x] 构建时注入：`setup.iss` 的 `MyAppVersion`、web 的 `__APP_VERSION__`、exe 的 VERSIONINFO
- [x] 校验：改一处版本号，重新打包后 exe 属性、安装包名、页面右上角三者一致

> **P1 验收**：桌面端只剩一套配置 UI；删掉 React 后包体积与启动时间下降；
> 版本号改一处即可全链路生效。

---

## P2 · 工程质量（预计 1 周，按需取舍）

### P2-1 拆分 server

- [x] `server.js`（1,397 行 / 51 路由）拆为 `routes/` 下 8 个领域文件，每个 < 250 行：
      `comics` / `rank` / `account` / `favorites` / `forum` / `tasks` / `settings` / `static`
- [x] `server/index.js` 只负责装配中间件与路由

### P2-2 DB 迁移

- [x] 引入 `PRAGMA user_version` + `migrations/NNN_*.js`
- [x] 现有 `CREATE TABLE IF NOT EXISTS` + `try ALTER` 收敛为编号迁移
- [x] 迁移在事务内执行，失败可回滚
- [x] **注意**：用户库实测 5.6 GB / 100 万+ 条 `comic_meta`，迁移脚本不得做全表重写

### P2-3 测试

只测"会算错"的地方，用 `vitest`：

- [x] `parser` 的 HTML 解析（准备固定 fixture）
- [x] `store` 的 upsert 与关联表去重（**回归 1.0.2 修过的 1171888 重复 tag 问题**）
- [x] `taskManager` 状态机（running / completed / error 的转换）
- [x] 不追求覆盖率

### P2-4 安全与稳定性

- [x] 监听地址从 `0.0.0.0` 改为 `127.0.0.1`（如需局域网访问，做成显式开关）
- [x] `/file` 代理增加域名白名单（当前可抓任意 http 地址，SSRF 面）
- [x] 日志按大小轮转（实测单文件已 852 MB）
- [x] `password` / `token` 考虑 Windows DPAPI 加密存储
- [x] 依赖版本统一：根 `express ^5` 与 core `express ^4` 收敛到一个大版本

> **P2 验收**：`server.js` 无单文件超 250 行；有可重复运行的迁移；
> 至少 3 个测试文件能在 CI 里跑。

---

## P3 · 构建与发布（预计 2–3 天）

### P3-1 一条命令出包

- [x] 新增 `build:release`：web → engine → server → pkg → installer
- [x] **消除手工复制**：`desktop/runtime/jm.core.all.cjs` 由构建脚本自动从 `core/dist` 复制
- [x] 清理 `dist/` 后再构建（旧产物会污染判断）
- [x] 打包后自动校验 exe 的图标与 VERSIONINFO（回归 1.0.2 修过的图标问题）

### P3-2 CI / 自动发布

- [x] GitHub Actions：push tag → 构建 → 上传 Release 资产
- [x] 资产清单固定为 5 个：`JM-Setup-x.y.z.exe` / `JM.zip` / `jm.core.exe` / `jm.core.all.js` / `jm.core.js`
- [x] 大文件上传注意：本机代理会在 30 MB 以上断连，CI 里直连即可

### P3-3 文档

- [x] `docs/BUILD.md`：构建与发布流程
- [x] `docs/CONFIG.md`：配置项说明（从 schema 生成）
- [x] 更新 `README.md`：说明唯一交付形态是桌面端

> **P3 验收**：干净机器上 `git clone && npm i && npm run build:release` 一次成功。

---

## 建议执行顺序

```
P0（清理，无风险）
   ↓
P2-1 拆 server + P2-2 DB 迁移（打地基，与 UI 无关）
   ↓
D1 决策 → P1（收口桌面形态）
   ↓
P2-3 测试 + P2-4 安全
   ↓
P3 构建与发布
```

**理由**：P0 立刻见效且零风险；P2-1/P2-2 与 UI 决策无关，可并行推进；P1 改动面最大，放在地基之后。

---

## 风险登记

| 风险 | 影响 | 缓解 |
|---|---|---|
| 用户库 5.6 GB / 100 万+ 行 | 迁移脚本写错可能毁库 | 迁移前自动备份；禁止全表重写；先在副本上演练 |
| 删依赖后构建才报错 | 漏删或多删 | 每删一批就完整构建 + 启动冒烟 |
| P1 改首启流程 | 老用户升级后可能进不去 | 保留"已有 config.json 则直接进主界面"的兼容分支 |
| 桌面壳改动影响托盘/单实例 | 关窗行为异常 | 保留 `mw.on_close` / 托盘菜单的现有行为，只换渲染层 |
| 大文件上传断连 | 发布失败 | 直连 + `curl --http1.1`（已验证可行） |

---

## 进度记录

| 日期 | 阶段 | 内容 | 结果 |
|---|---|---|---|
| 2026-10-24 | —— | 完成架构梳理，输出本规划 | 未开始实施 |
| 2026-10-24 | P0 | 清理废弃包 / 死代码 / 死接口 / 死依赖 / 大文件，补 LICENSE，文档归位 | ✅ 完成，见下方 P0 执行记录 |

### P0 执行记录（2026-10-24）

**已完成**

| 项 | 实际动作 |
|---|---|
| P0-1 | 删除 `packages/vscode/`（25 个跟踪文件）、`packages/taskbar-progress/`；从 `workspaces` 移除 vscode |
| P0-2 | 删除 `util/lanzou.js`、`aria2.js`、`cache.js`、`cookie.js` |
| P0-3 | 删除 `handleJmConfig`、`handleBrowse` 两个函数及其 3 个路由注册（`/api/jm-config`、`/api/browse-dir`、`/api/browse-file`） |
| P0-4 | 删除 8 个未使用依赖（`@agentine/herald`、`@libsql/client`、`abort-controller`、`better-sqlite3`、`fdir`、`tunnel`、`typescript`、`undici`），`npm install` 移除 47 个包 |
| P0-5 | 删除 `apktool.jar`(23.25MB)、`ComicsViewer_3.08/`(6.81MB)、`icon.bak/`(4.53MB)、`resources/icon.svg`(1MB)、`packages/build/jm.bundle.jpg`、`test/fetchInfo.json`(4.45MB)、重复的 `desktop/public/icons.svg` |
| P0-6 | 新增 `LICENSE`(MIT)；`禁止规则.md` / `优先参照.md` → `docs/guidelines/`，`jm-api.md` / `vue-router-pagination-bug-record.md` → `docs/reference/` |

**偏差与调整**

| 项 | 原计划 | 实际 | 原因 |
|---|---|---|---|
| `supports-color` | 删除 | **保留** | 它是 `debug` 的传递依赖，删除后 webpack 新增 1 条警告，破坏构建基线 |
| `protocol.js` 9 个类 | 删除 | **保留** | 这些类在 `crawler.js` 的 JSDoc 类型注解里被引用，删除会留下悬空引用 |
| `runtime/jm.core.all.cjs` | 停止跟踪 | 停止跟踪 + **新增自动同步步骤** | 仅取消跟踪会导致打包失败；在 `package.js` 增加 Step 2 从 `core/dist` 自动复制 |
| `resources/icon.png` | 删除 | **保留** | 它是 `build/gen-icon.cjs` 的图标源文件 |
| `resources/jm-api/*.apk` | 删除 | **保留（本地）** | 已被 gitignore 未跟踪，不影响仓库体积 |

**验收结果**

| 指标 | 目标 | 实测 |
|---|---|---|
| 已跟踪体积 | < 12 MB | **4.23 MB**（原 57.17 MB，↓ 93%） |
| 已跟踪文件数 | —— | 163（原 209） |
| core 构建 | 通过 | ✅ 警告数与清理前一致（4/5 条） |
| desktop 构建 | 通过 | ✅ |
| 桌面端打包 | 通过 | ✅ exe + 安装包均产出 |
| exe 启动冒烟 | 通过 | ✅ 服务启动、UI 加载、接口 200、已删接口 404 |
| 版本号 | 保持 1.0.2 | ✅ exe 属性与页面显示一致 |

**遗留（未纳入 P0，按 ROADMAP 后续阶段处理）**

- `resources/jm-api/JMComic3v2.0.25.apk`（28MB）仍在本地磁盘，已 gitignore，可随时删
- `resources/首页.txt`、`resources/jm/decompile-apk.*` 属参考资料，未删
- 根 `express ^5` 与 core `express ^4` 版本不一致（P2-4）
- 服务监听 `0.0.0.0`、日志无轮转（P2-4）

---

### P1 执行记录（2026-10-24）

**决策**：D1 = A（删 React 套壳），D2 = A（保留 CLI）。

**已完成**

| 项 | 实际动作 |
|---|---|
| P1-1 | 删除 `packages/desktop/src/` 下 React 全部（`App.tsx`/`main.tsx`/`App.css`/`index.css`/`env.d.ts`/assets），删除 `index.html`/`vite.config.ts`/`tsconfig*.json`/`eslint.config.js`/`dev.js`/`public/`；保留 `logger.js`/`tray.js`（原生能力） |
| P1-1 | `app.js` 重写：删除首启分支与 `loadConfig/saveConfig/configSaved`，窗口直接指向 `bundle.state.server.homeUrl` |
| P1-2 | 新增 `packages/core/src/config-schema.js`：19 个字段（12 可见 + 7 内部）的单一来源，含类型/默认值/分组/校验 |
| P1-2 | `config.js` 的 `defaultConfig` 改由 schema 生成 |
| P1-2 | 新增 `GET/POST /api/config`：schema 驱动白名单、类型校验、密码不回传明文、隐藏字段拒绝写入 |
| P1-2 | 新增 `packages/web/src/components/ConfigForm.vue`：schema 驱动渲染（首启页与设置弹窗共用一份） |
| P1-2 | 新增 `packages/web/src/pages/SetupPage.vue`（`/setup` 路由）+ App.vue 首启检测跳转 |
| P1-2 | `SettingsDialog.vue` 从"只能改和谐模式"改为完整设置（复用 ConfigForm） |
| P1-3 | 删除 `packages/desktop/runtime/config.json`（内含 `F:\jm` 硬编码），首启数据目录由 schema 默认值 + 用户选择决定 |
| P1-4 | 版本号唯一来源=根 `package.json`；`build/package.js` 生成 `version.iss` 供 `setup.iss` 引用；新增 `scripts/sync-version.mjs`（含 `--check`）；web 的 `__APP_VERSION__` 也改读根 package.json |
| 附带 | `package.js` 增加 dist 清理（避免旧产物污染 zip）；根 `package.json` 新增 `build:release` 等脚本 |

**偏差与调整**

| 项 | 说明 |
|---|---|
| `logger.js` / `tray.js` | 删除 React 时误删，已从 git 恢复。它们是原生能力，不属于 React |
| `runtime/config.json` | 原计划"改成空占位"，实际**直接删除**——P1 后首启走 SPA，该文件已无任何引用 |
| 打包脚本清理 | 原属 P3-1，因本次发现旧产物污染 dist，提前做掉 |

**验收结果**

| 指标 | 目标 | 实测 |
|---|---|---|
| 配置 UI 数量 | 1 套 | ✅ 三套（ConfigPage/SettingsModal/web SettingsDialog）→ 1 套（ConfigForm 复用） |
| desktop 代码量 | 大幅下降 | **1,368 行 → 800 行**（删 React 后仅剩 app.js + logger + tray） |
| desktop 依赖 | 删除 React 全家桶 | ✅ `npm install` 移除 109 个包 |
| 已跟踪体积 | 继续下降 | 4.23 MB → **3.19 MB** |
| web 构建 | 通过 | ✅ SetupPage chunk 正常产出 |
| core 构建 | 通过 | ✅ 警告数不变（4/5） |
| 桌面端打包 | 通过 | ✅ exe + 安装包，`version.iss` 自动生成 |
| 首启流程 | 实机通过 | ✅ 无配置启动 → `setupCompleted=false` → 保存 11 项 → `setupCompleted=true` |
| 配置校验 | 生效 | ✅ 非法端口被拒（"端口 不能小于 1024"） |
| 隐藏字段保护 | 生效 | ✅ 尝试写 `token` 被忽略（`saved=[]`） |
| 密码不回传 | 生效 | ✅ GET 返回空值 + `password__hasValue` 标记 |
| 版本号一致性 | 改一处全链路生效 | ✅ 根 package.json → version.iss → 安装包名 → exe 属性 → 页面显示 |

**P1 未做（按计划留给后续阶段）**

- P1-1 中"删除 React 后包体积/启动时间下降"的量化测量（留待 P3 统一基准）
- 老用户升级兼容：已在 P2-0 解决（见下）

---

### P2 执行记录（2026-10-24）

**已完成**

| 项 | 实际动作 |
|---|---|
| **P2-0（新增）config.json 兼容** | `config.js` 增加 `migrateConfig()`：①无配置=全新用户走引导；②有配置但无 `setupCompleted`=老用户视为已完成，**不再强制重走引导**；③补齐 schema 新增字段；④保留未知字段不丢数据；⑤写入 `configSchemaVersion` 便于后续迁移 |
| P2-1 拆分 server | `server.js` 1,426 行 → **201 行**（仅装配 + 共享上下文）；新增 `src/routes/` 下 11 个领域文件，全部 < 200 行 |
| P2-2 DB 迁移 | 新增 `src/migrations/index.js`：`PRAGMA user_version` + 编号迁移；baseline 用幂等 DDL 补齐（`CREATE IF NOT EXISTS` / `ADD COLUMN` 探测） |
| P2-3 测试 | 新增 `npm test` 与 3 个测试文件、26 个用例 |
| 附带 | `store.js` 的建表逻辑全部收敛进迁移；`connect()` 变为 `migrate()` 调用 |

**P2-1 拆分明细**

| 文件 | 行数 | 职责 |
|---|---|---|
| `server.js` | 201 | 装配、中间件、进度推送节流、上下文构建 |
| `routes/context.js` | 78 | 共享工具（wrapHandler/fmtDate/toFileUrl/rewriteComicMediaUrls） |
| `routes/static.js` | 82 | 前端静态资源 + /file 代理 |
| `routes/settings.js` | 108 | settings / config / sync |
| `routes/comics.js` | 199 | 列表 / 详情 / 元数据 / 购买 / 搜索 |
| `routes/rank.js` | 189 | 每周 / 连载 / 最新 / 分类 / 推广 |
| `routes/favorites.js` | 102 | 收藏夹 |
| `routes/library.js` | 135 | 已读 / 屏蔽 / 关注 / ZIP / 外部阅读器 |
| `routes/tags.js` | 73 | 标签/作品/角色联想（带缓存） |
| `routes/account.js` | 53 | 登录 / 登出 / 签到 |
| `routes/tasks.js` | 71 | 下载任务 |
| `routes/forum.js` | 41 | 评论区 |
| `routes/ws.js` | 28 | WebSocket |

**关键设计决策与踩坑**

| 事项 | 说明 |
|---|---|
| **迁移版本从 3 起** | 实测发现真实用户库 `PRAGMA user_version` 已是 **2**（历史版本写的，但当时并无迁移体系，2 无实际语义）。若从 1 起编号，会命中"库版本高于代码"分支而**永久跳过迁移**。因此 baseline 定为 **3** |
| **禁止全表重写** | 用户库 5.28 GB / 101 万条 `comic_meta` / 492 万条标签关联。baseline 只做 `CREATE IF NOT EXISTS`、`ADD COLUMN`（探测后执行）、`CREATE INDEX IF NOT EXISTS`，**不碰任何行数据** |
| 关联表首次填充 | 仅在关联表为空时执行，避免每次启动全表扫描 |
| 迁移失败处理 | 单条失败即抛错中止，`user_version` 停在上一版，下次可重试 |
| 路由一致性验证 | 写了 `test/route-parity.js` 对比拆分前后路由集合：51 → 50，差异恰为 P0 删的 3 个死接口 + P1 加的 2 个 `/api/config`，**无意外丢失** |

**验收结果**

| 指标 | 目标 | 实测 |
|---|---|---|
| `server.js` 行数 | < 250 | **201 行**（原 1,426） |
| 单文件最大行数 | < 250 | **199 行**（comics.js） |
| 路由丢失 | 0 | ✅ 48 个路由一一对应 |
| 迁移幂等 | 可重复执行 | ✅ 连续 3 次无变化 |
| **真实库副本演练** | 数据不变、耗时可控 | ✅ 5.28GB 副本迁移 **0.2 秒**，行数完全不变（1011144 / 4923468 / 416 / 812506 / 108），版本 2→3 |
| 配置兼容 | 老用户不被强制引导 | ✅ 10 个用例覆盖（含真实文件往返） |
| DB 迁移测试 | 覆盖老库升级/回归 | ✅ 10 个用例（含 1171888 重复标签回归） |
| store 端到端 | 走迁移后功能正常 | ✅ 6 个用例 |
| 全部测试 | 通过 | ✅ 3 个文件 / 26 个用例 |
| 桌面端 exe | 启动 + 路由 + 首启 | ✅ 启动正常、7 个路由抽查全 200、首启流程正常 |

**遗留**

- `test/` 下仍有 22 个历史手工脚本（需联网/人工介入），未纳入 `npm test`
- 数据库懒加载：首次访问 API 时才建库并迁移（原有行为，已确认非缺陷）

---

### P2-4 执行记录（2026-10-25）

**已完成（5/5）**

| 项 | 实现方式 |
|---|---|
| 监听地址 | `server.js` 改为读 `config.listenHost`，默认 `127.0.0.1`；需局域网时显式设为 `0.0.0.0`。已加入 config-schema（network 组，requiresRestart） |
| `/file` 白名单 | 新增 `src/security/file-host-guard.js`：协议白名单、主机名白名单（内置站点 + host/cdnHosts/apiHosts + allowedFileHosts）、拒绝本机/内网/云元数据/IP 直连 |
| 日志轮转 | 新增 `src/log-rotate.js`（桌面端）：按大小轮转（默认 20MB × 3 份），启动时已超限立即轮转 |
| 敏感配置加密 | 新增 `src/security/secret-codec.js`（core，可注入）+ `src/secret-codec.js`（desktop，AES-256-GCM + scrypt 派生密钥）；`config.js` 落盘加密、读取解密 |
| express 统一 | 根与 core 统一到 `^5.2.1`（实际安装 5.3.0），删除未使用的 `http-proxy-middleware`；core 不再有独立 express 副本 |

**关键踩坑（3 个，均已解决）**

| 问题 | 现象 | 根因与解法 |
|---|---|---|
| **koffi 在 pkg 下不可用** | DPAPI 方案在打包版始终报"crypt32 加载失败" | 独立测试脚本确认：pkg 内 `require('koffi')` 直接 `Cannot find module`（koffi 用动态 require 加载原生模块，pkg 静态分析抓不到）。**改用 Node 内置 `crypto` 的 AES-256-GCM**，零原生依赖 |
| **`/file` 被 SPA 兜底吞掉** | 守卫代码存在但请求返回 200/index.html | `registerWebStatic` 的 SPA fallback（`!path.extname(p)` → 返回 index.html）吃掉了 `/file/xxx`。修复：`/file` 与 `/api` 一并跳过静态兜底（**这是原有 bug，非本次引入**） |
| **构建产物未更新** | 改了源码但 bundle 行为不变 | 删 `core/dist` 强制重建后生效。教训：验证前必须确认 bundle 含新代码（grep 关键字符串） |

**加密方案说明（重要）**

最终采用 **AES-256-GCM + scrypt(N=32768,r=8,p=1) 派生密钥**，密钥材料为 `机器名 + 用户名 + 用户域 + 应用盐`。

| 能防 | 不能防 |
|---|---|
| config.json 被拷到别的机器/别的用户后解密 | 本机同用户的恶意程序（需 DPAPI/凭据管理器） |
| 随手打开配置文件看到明文密码 | 内存取证 |

> 相比 DPAPI 是弱一些，但**零原生依赖、打包稳定**，且显著优于明文。若将来要上 DPAPI，需先解决 koffi 在 pkg 下的加载问题（或改用 Node-API 手写插件）。

**验收结果**

| 指标 | 期望 | 实测 |
|---|---|---|
| 监听地址 | 仅 127.0.0.1 | ✅ `Get-NetTCPConnection` 仅 `127.0.0.1` |
| SSRF 本机地址 | 403 | ✅ 403 + 日志"禁止访问本机地址" |
| SSRF 内网地址 | 403 | ✅ 403 + 日志"禁止访问内网地址" |
| SSRF 云元数据 | 403 | ✅ 403 |
| SSRF 未知域名 | 403 | ✅ 403 |
| 合法域名 | 放行（非 403） | ✅ 无拒绝日志，走 fetchRemoteFile |
| 密码落盘 | 密文 | ✅ `enc:v1:6XFaOVSM...` |
| 加密往返 | 重启后可解密 | ✅ 重启后 `passwordHasValue=true`，登录接口收到解密后的密码（返回 401 而非"请输入用户名和密码"） |
| 日志轮转 | 按大小切割 | ✅ 6 个用例（含启动超限、backups=0、篡改检测） |
| 白名单单测 | 全覆盖 | ✅ 19 个用例 |
| 加密单测 | 全覆盖 | ✅ 12（core）+ 10（desktop）用例 |
| express 版本 | 单一版本 | ✅ 5.3.0，core 无独立副本；bundle 7.47MB → 6.97MB |
| 全量测试 | 通过 | ✅ 7 个文件 / 62 个用例 |
| 桌面端 exe | 启动 + 安全项生效 | ✅ 全部验证通过 |

**遗留**

- `allowedFileHosts` 配置项已支持但未在 UI 暴露（需手动编辑 config.json）
- 加密密钥与机器绑定：换机器后需重新填写密码（已做降级处理，返回空值不崩溃）

---

### 移除托盘（2026-10-25）

**背景**：用户反馈「原本设计可以最小化，但桌面端最小化有问题，且退出应用后托盘还在」，决定直接移除托盘。

**根因（实测定位）**

问题不在托盘本身，而在 `confirm_close: true`：
- ewvjs 的 `confirm_close` 会在关闭窗口时弹二次确认框；
- 用户点 X 后窗口关闭，但确认框让进程挂起等待，`on_close` 未及时触发退出；
- 进程不退出 → 托盘图标（及本地服务）残留。

**改动**

| 文件 | 改动 |
|---|---|
| `packages/desktop/src/tray.js` | **删除**（266 行） |
| `packages/desktop/app.js` | 移除 `createTray` import、`setupTray()`、`getTrayMenu()`、`trayRef`、`mainWinAlive`；新增 `quitApp()` 统一退出（停服务 → 退进程）；`on_close` → `quitApp(0)`；右键菜单去掉"隐藏到托盘"；补 `SIGTERM`/`SIGINT`/`uncaughtException` 兜底 |
| `packages/desktop/app.js` | `confirm_close: true` → **`false`**（关窗即退出，无需二次确认） |
| `packages/desktop/build/package.js` | 移除 koffi 原生 assets（托盘已删，logger 的 koffi 失败时会安全降级） |
| `packages/desktop/app.js` | 移除 `hideToTray` 暴露的 API（前端未使用） |

**验收结果**

| 场景 | 期望 | 实测 |
|---|---|---|
| 启动 | 正常 | ✅ HTTP 200 |
| 关窗后进程退出 | 退出 | ✅ `HasExited=true`，退出码 0 |
| 端口释放 | 释放 | ✅ 47310 已释放 |
| 残留进程 | 0 | ✅ 0 |
| 二次启动（端口复用） | 成功 | ✅ 启动正常 |
| 二次关窗 | 退出 | ✅ 通过 |
| 托盘代码残留 | 无 | ✅ 全仓库 grep `tray` 为空 |
| 全量测试 | 通过 | ✅ 7 个文件 / 62 个用例 |

**影响**

- 关闭窗口 = 退出应用，不再有后台常驻
- 托盘图标问题（退出后正确消失）随进程正确退出而解决
- koffi 依赖仅剩 `logger.js` 的 debug 控制台功能，且失败时安全降级

---

### P3 执行记录（2026-10-25）

**已完成（10/10）**

| 项 | 实现方式 |
|---|---|
| 一条命令出包 | `npm run build:release`：sync-version → check-version → build:core → build:desktop → build:installer；另提供 `build:portable`（跳过安装包） |
| 消除手工复制 | `package.js` Step 2 从 `core/dist` 自动同步 runtime bundle（P0 已加，P3 确认可用） |
| 清理 dist 后构建 | `package.js` 启动时清空 `packages/desktop/dist` |
| **打包后自动校验** | 新增 Step 7：校验图标资源、VERSIONINFO（ProductName 非 Node.js、FileVersion 与 package.json 一致）、子系统 GUI(2)、关键文件齐全 |
| CI / 自动发布 | 新增 `.github/workflows/release.yml`：tag 触发 → 构建 → 上传 5 个固定资产 → 创建 Release；支持手动触发只出 artifact |
| 固定 5 个资产 | `JM-Setup-<ver>.exe` / `JM.zip` / `jm.core.exe` / `jm.core.all.js` / `jm.core.js` |
| 大文件上传 | CI 直连不受代理影响；文档中注明本地手动上传用 `curl --http1.1` |
| `docs/BUILD.md` | 环境要求、命令、流程详解、踩坑说明、发布流程、FAQ |
| `docs/CONFIG.md` | **从 config-schema 自动生成**（`scripts/gen-config-doc.mjs`），含 `--check` 供 CI 校验一致性 |
| 更新 README | 明确桌面端为唯一图形交付形态；补充下载说明、关闭行为、构建入口 |

**关键踩坑**

| 问题 | 现象 | 根因与解法 |
|---|---|---|
| **pkg 模板自动下载走错分支** | 无缓存时 `pkg-fetch` 试图从源码编译，报 `spawnSync patch ENOENT` | `need()` 会「先下载、失败则编译」。Windows 无 `patch` 命令，编译必然失败。改用 `need({ forceFetch: true })` **强制只下载不编译** |
| **`need()` 的 `output` 参数语义** | 传了文件路径，结果生成 `fetched-xxx/` 目录 | `output` 是**缓存目录**，`need()` 会在其下拼 `node-<ver>-<platform>-<arch>`。修正为不传该参数 |
| **`pkg-fetch` CLI 依赖缺失** | `Cannot find module 'ansi-styles'` | 其 `bin.js` 依赖未安装完整。改用 JS API（`require('@yao-pkg/pkg-fetch').need`） |
| `ResEdit.IconGroupEntry.parse` 不存在 | 校验脚本崩溃 | 该 API 只有 `fromEntries`/`replaceIconsForResource`。改用统计 icon 资源（type 3）数量 |

**验收结果**

| 指标 | 期望 | 实测 |
|---|---|---|
| 干净构建（删全部产物） | 一次成功 | ✅ 删除 core/web/desktop dist + installer + version.iss 后 `build:release` 成功 |
| 产物校验 | 自动执行 | ✅ Step 7 通过（图标 / VERSIONINFO v1.0.2 / 子系统 2 / 关键文件） |
| 无 pkg 缓存 | 自动下载 | ✅ `forceFetch` 下载 57.4MB 模板成功（走代理模拟） |
| 安装包路径可配置 | 支持 ISCC_PATH | ✅ 自动查找 + 环境变量覆盖 + 明确报错 |
| 版本一致性 | 构建前校验 | ✅ `check-version` 作为 release 第一步 |
| 配置文档同步 | CI 可校验 | ✅ `check-config-doc` 通过 |
| YAML 语法 | 合法 | ✅ `yaml-lint` 通过 |
| exe 可用 | 启动 + 首启 + 监听 | ✅ 启动正常、`setupCompleted=false`、13 个字段、监听 127.0.0.1 |
| 全量测试 | 通过 | ✅ 7 个文件 / 62 个用例 |

**产物清单（1.0.2）**

| 产物 | 大小 |
|---|---|
| `JM漫画管理器.exe` | 64.70 MB |
| `JM漫画管理器.zip` | 31.58 MB |
| `JM漫画管理器-Setup-1.0.2.exe` | 20.08 MB |
| `jm.core.all.js` | 6.97 MB |
| `jm.core.js` | 6.15 MB |

**遗留**

- CI workflow 尚未在真实 GitHub Actions 上跑过（本地已验证各步骤命令可用）；首次推送 tag 时需观察
- `jm.core.exe` 未纳入 `build:release`（它由 `packages/core` 的 `build:pkg` 单独产出，耗时较长），CI 中当前从 `core/dist` 取已有产物 —— 若需每次重新生成，需在 workflow 里增加一步
