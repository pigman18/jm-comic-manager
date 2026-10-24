# 配置说明（CONFIG）

> 本文由 `scripts/gen-config-doc.mjs` 从 `packages/core/src/config-schema.js` **自动生成**，请勿手工修改。
> 重新生成：`node scripts/gen-config-doc.mjs`

## 配置文件位置

| 平台 | 路径 |
|---|---|
| Windows | `%APPDATA%\JmComicManager\config.json` |
| macOS | `~/Library/Application Support/JmComicManager/config.json` |
| Linux | `~/.config/JmComicManager/config.json` |

配置结构版本：**2**（记录在 `configSchemaVersion` 字段）

---

## 基本设置

| 字段 | 说明 | 类型 | 默认值 | 需重启 |
|---|---|---|---|---|
| `username` | 用户名<br>示例：输入 JM 账号 | 文本 | 空字符串 | 否 |
| `password` | 密码<br>示例：输入 JM 密码 | 密码 | 空字符串 | 否 |
| `dataDir` | 数据目录<br>示例：如 D:\JM_Data | 目录 | `null` | 是 |
| `port` | 端口<br>范围：1024 ~ 65535 | 数字 | `47310` | 是 |
| `comicViewer` | 漫画阅读器<br>示例：C:\Program Files\... | 文件 | `C:\Program Files\ComicRack\ComicRack.exe` | 否 |

## 网络设置

| 字段 | 说明 | 类型 | 默认值 | 需重启 |
|---|---|---|---|---|
| `listenHost` | 监听地址<br>示例：127.0.0.1（默认，仅本机）或 0.0.0.0（允许局域网访问） | 文本 | `127.0.0.1` | 是 |
| `host` | JM 主站 | 文本 | `https://18comic.vip` | 是 |
| `cdnHosts` | CDN 域名<br>示例：输入 CDN 域名后回车 | 字符串列表 | `https://cdn-msp.18comic.vip`、`https://cdn-msp2.18comic.vip`、`https://cdn-msp3.18comic.vip` | 否 |
| `apiHosts` | API 域名<br>示例：输入 API 域名后回车 | 字符串列表 | `https://www.cdnhjk.net`、`https://www.cdngwc.cc`、`https://www.cdngwc.net`、`https://www.cdngwc.club` | 否 |
| `timeout` | 请求超时（ms）<br>范围：1000 ~ +∞ | 数字 | `86400000` | 否 |
| `proxy` | 代理地址<br>示例：http://127.0.0.1:10809 | 文本 | `null` | 是 |

## 高级设置

| 字段 | 说明 | 类型 | 默认值 | 需重启 |
|---|---|---|---|---|
| `debug` | 启用调试日志 | 开关 | `false` | 是 |
| `toast` | 下载完成后弹出系统通知 | 开关 | `false` | 否 |

## 内部字段

| 字段 | 说明 | 类型 | 默认值 | 需重启 |
|---|---|---|---|---|
| `token` | 登录 Token（内部字段，不参与界面） | 文本 | 空字符串 | 否 |
| `cookie` | 登录 Cookie（内部字段，不参与界面） | 文本 | 空字符串 | 否 |
| `memberInfo` | 会员信息（内部字段，不参与界面） | 对象 | `null` | 否 |
| `harmony` | 和谐模式（内部字段，不参与界面） | 开关 | `false` | 否 |
| `harmonyThreshold` | 和谐阈值（内部字段，不参与界面） | 数字 | `50` | 否 |
| `harmonyUseCover` | 和谐使用封面图（内部字段，不参与界面） | 开关 | `false` | 否 |
| `setupCompleted` | 已完成首启引导（内部字段，不参与界面） | 开关 | `false` | 否 |

---

## 敏感字段加密

以下字段在落盘时会自动加密（格式 `enc:v1:<base64>`）：

`password`、`token`、`cookie`

**加密方案**：AES-256-GCM + scrypt 派生密钥，密钥材料为「机器名 + 用户名 + 用户域 + 应用盐」。

| 能防 | 不能防 |
|---|---|
| 配置文件被拷到别的机器/用户后解密 | 本机同用户的恶意程序 |
| 随手打开文件看到明文密码 | 内存取证 |

> 换机器后密文无法解密，对应字段会返回空值（不会崩溃），重新填写即可。
> 非桌面端环境（如 CLI）没有加密能力，读取时会降级为空值。

---

## 修改方式

1. **桌面端设置页**（推荐）：右键托盘区域已移除，使用应用内「设置」或首启引导
2. **直接编辑** `config.json`：修改后重启应用生效（标记「需重启」的字段）
3. **HTTP 接口**：`GET /api/config` 读取、`POST /api/config` 写入（只接受 schema 中可见字段）
