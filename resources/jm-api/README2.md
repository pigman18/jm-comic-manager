# JMComic3 v2.0.25 API 接口详细文档 (READMD2)

> 基于 APK 反编译 + source map 提取 TypeScript 源码生成，部分参数经**实际 HTTP 请求验证** | 记录了每个接口的**精确参数名**和**响应结构**

---

## 目录

1. [架构说明](#架构说明)
2. [通用请求头 & 鉴权](#通用请求头--鉴权)
3. [加密/解密机制](#加密解密机制)
4. [通用响应格式](#通用响应格式)
5. [API 端点完整映射表](#api-端点完整映射表)
6. [接口详细参数](#接口详细参数)
   - [漫画核心](#1-漫画核心)
   - [首页与发现](#2-首页与发现)
   - [搜索](#3-搜索)
   - [分类](#4-分类)
   - [排行榜/周榜](#5-排行榜周榜)
   - [收藏/点赞/历史](#6-收藏点赞历史)
   - [虚拟货币](#7-虚拟货币)
   - [小说](#8-小说)
   - [游戏](#9-游戏)
   - [视频](#10-视频)
   - [论坛/评论](#11-论坛评论)
   - [创作者/作者](#12-创作者作者)
   - [每日签到](#13-每日签到)
   - [通知](#14-通知)
   - [用户与设置](#15-用户与设置)
   - [广告](#16-广告)
   - [其他](#17-其他)
7. [Host 发现机制](#host-发现机制)
8. [组件/页面路由表](#组件页面路由表)
9. [LocalStorage 存储键](#localstorage-存储键)

---

## 架构说明

- **应用类型**: React (CRA) + Capacitor 混合 App
- **状态管理**: Redux Toolkit (createAsyncThunk + createSlice)
- **网络层**: 自封装的 `HttpUtil` (基于 fetch)
- **响应加密**: AES-ECB 响应体解密 (两层备选密钥)
- **路由**: react-router-dom

### Host 发现流程

1. 从 CDN 地址获取加密文本 → AES-ECB 解密 → 得到 `{ Server: string[], jm3_Server: string }`
2. 从 `Server` 数组随机选一个 item → `https://{item}/` 作为 `apiUrl`
3. 从 `jm3_Server` 过滤掉 `"線路5"` → `https://{item}/` 作为 `host`
4. 通过 `GET {apiUrl}/setting` 获取 `main_web_host` 等配置

### API 地址格式

```
GET  {apiUrl}/{path}?key1=value1&key2=value2
POST {apiUrl}/{path}  (body: FormData)
```

---

## 通用请求头 & 鉴权

每次 HTTP 请求自动附加以下 Headers（来源: `api/HttpUtil.ts`）：

| Header | 值 | 说明 |
|--------|-----|------|
| `Tokenparam` | `{unix_timestamp},{version}` | 如 `1718198400,2.0.25` |
| `Token` | `md5(String(timestamp) + "185Hcomic3PAPP7R")` | 时间戳 + 固定密钥的 md5 |
| `Authorization` | `Bearer {jwttoken}` | 从 `localStorage.getItem("jwttoken")` 读取 |
| `Cookie` | `AVS={memberInfo?.s}` | 从 `localStorage.getItem("memberInfo")` 中取 `s` 字段 |

### Token 生成逻辑

```typescript
const version = process.env.REACT_APP_VERSION; // "2.0.25"
const time = Math.floor(gmtTime.getTime() / 1000);
const tokenParam = time + "," + version;        // "1718198400,2.0.25"
const token = md5(String(time) + "185Hcomic3PAPP7R");
// Header: Tokenparam=1718198400,2.0.25&Token=<md5 hash>
```

### 超时机制

- 超时时间: **15 秒**
- GET/POST 分别有 **3 次自动重试**

---

## 加密/解密机制

### 响应体解密 (`tryDecryption`)

所有接口的响应体 `responseObj.data` 使用 AES-ECB 加密，尝试以下 **2 个密钥** 依次解密：

| 密钥# | ASCII 转字符串 | 说明 |
|-------|---------------|------|
| 1 | `[49, 56, 53, 72, 99, 111, 109, 105, 99, 51, 80, 65, 80, 80, 55, 82]` → `"185Hcomic3PAPP7R"` | 常规密钥 |
| 2 | `[49, 56, 99, 111, 109, 105, 99, 65, 80, 80, 67, 111, 110, 116, 101, 110, 116]` → `"18comicAPPContent"` | 备用密钥 |

解密步骤:
```
content = 密钥 ASCII 转字符串
keyToTry = md5(time + content)    // 广告接口用 md5(content)
keyObj = CryptoJS.enc.Utf8.parse(keyToTry)  // 注意：md5 返回 hex 字符串（32 字符），
                                            // 按 UTF-8 解析后得 32 字节 → AES-256-ECB
decrypt = CryptoJS.AES.decrypt(responseObj.data, keyObj, { mode: CryptoJS.mode.ECB })
result = JSON.parse(decrypt.toString(CryptoJS.enc.Utf8))
```

### Host 文本解密 (`decryptData`)

```typescript
// 固定密钥的 md5
const key = CryptoJS.enc.Utf8.parse(md5("diosfjckwpqpdfjkvnqQjsik"));
```

### 图片还原 (scramble_image)

漫画图片被切割加密，通过 `aid` 和 `page` 的 base64 编码 + md5 计算切割份数（2~20 份），在 canvas 上重新排列。

---

## 通用响应格式

```typescript
interface ApiResponse<T> {
    code: number;   // 200=成功
    data: T;        // AES-ECB 加密内容 (解密后可能含 status/msg)
    msg?: string;
}
```

- `code === 200` 表示成功
- `data` 层可能嵌套: `{ status: "ok"|"error", msg: "...", data: {...} }`

---

## API 端点完整映射表

| 常量名 | 路径 | 方法 | 用途 |
|--------|------|------|------|
| `API_APP_SETTING` | `setting` | GET/POST | App 设置 |
| `API_ADVERTISE_ALL` | `ad_content_all` | GET | 全部广告内容 |
| `API_ADVERTISE_CONTENT_COVER` | `advertise_all` | GET | 广告全覆盖(封面) |
| `API_NOVEL_LIST` | `novels` | GET | 小说列表 |
| `API_NOVEL_DETAIL` | `novel` | GET | 小说详情 |
| `API_NOVEL_CHAPTERS` | `novelchapters` | GET | 小说章节 |
| `API_NOVEL_SEARCH` | `search_novels` | GET | 小说搜索 |
| `API_NOVEL_LIKE` | `like` | POST | 小说点赞 |
| `API_NOVEL_COMMENT` | `comment` | POST | 小说评论 |
| `API_NOVEL_FAVORITES` | `novel_favorites` | GET/POST | 小说收藏 |
| `API_EDIT_NOVEL_FAVORITES` | `novel_favorites_folder` | POST | 小说收藏夹管理 |
| `API_NOVEL_COIN_BUY` | `coin_buy_nc` | POST | 小说金币购买 |
| `API_COMIC_SEARCH` | `search` | GET | 漫画搜索 |
| `API_COMIC_HOT_TAGS` | `hot_tags` | GET | 热门搜索标签 |
| `API_COMIC_RANDOM_RECOMMEND` | `random_recommend` | GET | 随机推荐 |
| `API_COMIC_PROMOTE` | `promote` | GET | 首页推广推荐 |
| `API_COMIC_LATEST` | `latest` | GET | 最新发布 |
| `API_COMIC_PROMOTE_LIST` | `promote_list` | GET | 推广更多列表 |
| `API_COMIC_SER_MORE_LIST` | `serialization` | GET | 连载更多列表 |
| `API_COMIC_CHAPTER` | `chapter` | GET | 漫画章节 |
| `API_COMIC_DETAIL` | `album` | GET | 漫画详情 |
| `API_COMIC_READ` | `comic_read` | GET | 漫画阅读 |
| `API_MEMBER_LOGIN` | `login` | POST | 用户登录 |
| `API_MEMBER_LOOUT` | `logout` | POST | 用户登出 |
| `API_MEMBER_REGISTER` | `register` | POST | 用户注册 |
| `API_MEMBER_FORGOT` | `forgot` | POST | 忘记密码 |
| `API_CATEGORIES_LIST` | `categories` | GET | 分类列表 |
| `API_CATEGORIES_FILTER_LIST` | `categories/filter` | GET | 分类筛选 |
| `API_FORUM_LIST` | `forum` | GET | 论坛帖子列表 |
| `API_COMMENT_SEND` | `comment` | POST | 发送评论 |
| `API_COMMENT_VOTE` | `comment_vote` | POST | 评论投票 |
| `API_FAVORITE_LIST` | `favorite` | GET/POST | 收藏列表/添加收藏 |
| `API_LIKE_DATA` | `like` | POST | 点赞 |
| `API_HISTORY_LIST` | `watch_list` | GET/POST | 浏览历史 |
| `API_GAMES_LIST` | `allgames` | GET | 游戏列表 |
| `API_VIDEOS_LIST` | `videos` | GET | 视频列表 |
| `API_LATEST_HANIME` | `latest_hanime` | GET | 最新 H 动漫 |
| `API_VIDEO_INFO` | `video` | GET | 视频详情 |
| `API_BAITU_CREATE_TOKEN` | `baitu-create-token` | GET | 百度图 Token |
| `API_BLOGS_LIST` | `blogs` | GET | 博客/公告列表 |
| `API_BLOG_INFO` | `blog` | GET | 博客详情 |
| `API_GAME_INFO` | `game` | GET | 游戏详情 |
| `API_FAVORITE_FOLDER` | `favorite_folder` | POST | 收藏夹管理 |
| `API_TASKS_LIST` | `tasks` | GET/POST | 任务列表 |
| `API_TASKS_BUY_LIST` | `coin` | POST | 金币购买 |
| `API_ERROR_LOG` | `error_log` | POST | 错误日志 |
| `API_WEEK` | `week` | GET | 每周必看 |
| `API_WEEK__FILTER_LIST` | `week/filter` | GET | 周榜筛选 |
| `API_ALBUM_DOWNLOAD` | `album_download_2` | GET | 专辑下载 |
| `API_USEREDIT` | `useredit` | GET/POST | 用户编辑 |
| `API_ADVERTISE` | `advertise` | GET | 广告 |
| `API_ADVERTISE_CONTENT` | `ad_content` | GET | 广告内容 |
| `API_DAILY` | `daily` | GET | 签到信息 |
| `API_DAILY_CHECK` | `daily_chk` | POST | 执行签到 |
| `API_DAILY_LIST` | `daily_list` | GET | 签到记录 |
| `API_DAILY_LIST_FILTER` | `daily_list/filter` | POST | 签到筛选 |
| `API_TAGS_FAVORITE` | `tags_favorite` | GET | 标签收藏列表 |
| `API_TAGS_FAVORITE_UPDATE` | `tags_favorite_update` | POST | 标签收藏更新 |
| `API_COIN_BUY_COMICS` | `coin_buy_comics` | POST | 金币购买漫画 |
| `API_COIN_BUY_CHARGE` | `coin_buy_charge` | POST | 金币充值 |
| `API_AD_FREE` | `ad_free` | POST | 去广告 |
| `API_NOTIFICATIONS` | `notifications` | GET/POST | 通知列表 |
| `API_NOTIFICATIONS_UNREAD` | `notifications/unreadCount` | GET | 未读通知数 |
| `API_NOTIFICATIONS_SERTRACK` | `album_sertracking` | GET/POST | 专辑追踪 |
| `API_NOTIFICATIONS_TRACK_LIST` | `album_tracking` | POST | 专辑追踪列表 |
| `API_CREATOR_AUTHOR` | `creator_author` | GET | 创作者信息 |
| `API_CREATOR_WORK` | `creator_work` | GET | 创作者作品列表 |
| `API_CREATOR_WORK_DETAIL` | `creator_author_work` | GET | 作者作品详情 |
| `API_CREATOR_WORK_INFO` | `creator_work_info` | GET | 作品信息 |
| `API_CREATOR_WORK_INFO_DETAIL` | `creator_work_info_detail` | GET | 作品详细信息 |

---

## 接口详细参数

### 1. 漫画核心

#### `GET {apiUrl}/album` — 漫画详情

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 漫画/专辑 ID |

**响应 (reducer: `detailReducer.detailList`)**: `Record<string, any>` — 完整的漫画详情对象

#### `GET {apiUrl}/comic_read` — 漫画阅读(章节图片)

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 章节 ID |

**响应 (reducer: `detailReducer.readList`)**: `Record<string, any>` — 包含章节图片列表等

#### `GET {apiUrl}/album_download_2/{id}` — 专辑下载

**参数**: `id` 通过 URL 路径传入，无查询参数

**响应 (reducer: `detailReducer.albumDownloadDetail`)**: `Record<string, any>`

#### `POST {apiUrl}/coin_buy_comics` — 金币购买漫画

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 漫画/章节 ID |

---

### 2. 首页与发现

#### `GET {apiUrl}/promote` — 首页推广推荐

**参数**: 无

**响应 (reducer: `mainReducer.mainList`)**: `any[]` — 推广位漫画列表

#### `GET {apiUrl}/latest` — 最新发布

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 是 | 页码 |

**响应 (reducer: `mainReducer.latestList`)**: `any[]` — 最新漫画列表，支持追加(loadMore)

#### `GET {apiUrl}/promote_list` — 推广更多列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 推广分类 ID |
| `page` | int | 是 | 页码 |

**响应 (reducer: `mainReducer.moreList`)**: `{ total: number, list: any[], error: string }`

#### `GET {apiUrl}/serialization` — 连载更多列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 否 | 类型筛选 |
| `date` | int | 否 | 日期筛选 (unix 时间戳) |
| `page` | int | 否 | 页码 |

**响应** 同 `promote_list`: `{ total, list, error }`

#### `GET {apiUrl}/hot_tags` — 热门搜索标签

**参数**: 无

**响应 (reducer: `searchReducer.hotTagsList`)**: `any[]`

#### `GET {apiUrl}/random_recommend` — 随机推荐

**参数**: 无

**响应 (reducer: `searchReducer.randomRecommendList`)**: `any[]`

---

### 3. 搜索

#### `GET {apiUrl}/search` — 漫画搜索

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `search_query` | string | 是 | 搜索关键词 |
| `o` | string | 否 | 排序方式 |
| `page` | int | 否 | 页码 |

**响应 (reducer: `searchReducer.searchList`)**:

```typescript
{
    list: any[],
    total: number,
    redirect_aid: string,   // 精确匹配时可能直接跳转到该 ID
    search_query: string
}
```

---

### 4. 分类

#### `GET {apiUrl}/categories` — 分类列表

**参数**: 无

**响应 (reducer: `categoriesReducer.categoriesList`)**: `Record<string, any>`

#### `GET {apiUrl}/categories/filter` — 分类筛选

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 是 | 页码 |
| `o` | string | 是 | 排序方式（见下方说明） |
| `c` | string | 否 | 分类 slug（如 `doujin`、`single`、`short`；**不传或传空串**=全部分类/A漫；传 `0`=按 id 0 过滤=A漫，与不传结果不同） |
| `order` | string | 否 | 固定传空字符串 `""` |

**`o` 参数实测定论（2026-06 实测验证）**：

APK 源码 `CatSortData()` 定义了 5 个预定义 key，但实际服务器接受的 `o` 值范围更广：

| `o` 值 | 含义 | 实测结果 | 说明 |
|--------|------|----------|------|
| `""` (空串) | 最新发布 | ✅ 有效 | 按时间倒序 |
| `"mr"` | 最新发布（别名） | ✅ 有效，等价于 `""` | web 前端 `ORDER_BY_LATEST` |
| `"tf"` | 最多爱心 | ✅ 有效 | 按点赞数排序，固定值 |
| `"mv"` | 总排行榜 | ✅ 有效 | 历史总观看量排行 |
| `"mp"` | 最多图片 | ✅ 有效 | web 前端 `ORDER_BY_PICTURE` |
| `"tr"` | 最高评分 | ✅ 有效 | web 前端 `ORDER_BY_SCORE` |
| `"md"` | 最多评论 | ✅ 有效 | web 前端 `ORDER_BY_COMMENT` |
| `"mv_m"` | 月排行榜 | ✅ 有效 | 本月观看量排行 |
| `"mv_w"` | 周排行榜 | ✅ 有效 | `mv`+`_w`（不是 `mp_w`！） |
| `"mv_t"` | 日排行榜 | ✅ 有效 | 今日观看量排行，总量较少 |
| `"mp_w"` | 周排行(图片) | ❌ 忽略 | 被服务器忽略，回退到最新发布 |
| `"mp_m"`、`"mr_t"` 等 | 其他时间组合 | ❌ 忽略 | 非 `mv` 基类的时间后缀均被忽略 |

**关键发现**：
- 时间后缀 `_t`/`_w`/`_m` **仅对 `mv`（最多观看）基类有效**，形成 `mv_t`、`mv_w`、`mv_m`
- APK 的 `CatSortData()` 中的 `"mp_w"` 被服务器忽略，web 周排行榜实际使用 `mv_w`
- 排序 `o` 值构造公式: `time === 'a' ? order_by : order_by + '_' + time` 有效，但只有 `order_by=mv` 时时间后缀才会产生不同结果
- `mr`（最新）和 `""`（空串）是等价别名

**响应 (reducer: `categoriesReducer.cateFilterList`)**:

```typescript
{
    list: any[],
    tags: any[],          // 可用的筛选标签列表
    total: number,
    search_query: string
}
```

---

### 5. 排行榜/周榜

#### `GET {apiUrl}/week` — 每周必看

**参数**: 无

**响应 (reducer: `weekReducer.weekList`)**: `Record<string, any>`

#### `GET {apiUrl}/week/filter` — 周榜筛选

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 筛选维度 ID |
| `type` | string | 是 | 筛选类型 |

**响应 (reducer: `weekReducer.weekFilterList`)**: `Record<string, any>`

---

### 6. 收藏/点赞/历史

#### `GET {apiUrl}/favorite` — 收藏列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 是 | 页码 |
| `folder_id` | string | 是 | 收藏夹 ID |
| `o` | string | 是 | 排序方式 |

**响应 (reducer: `memberReducer.favoriteList`)**:

```typescript
{
    list: any[],            // 收藏项列表
    folder_list: any[],     // 收藏夹列表
    total: number,
    count: number
}
```

#### `POST {apiUrl}/favorite` — 添加收藏

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `aid` | string | 是 | 漫画/专辑 ID |

#### `POST {apiUrl}/favorite_folder` — 收藏夹管理

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 操作类型: `"add"` / `"edit"` / `"move"` / `"del"` |
| `folder_id` | string | 否 | 收藏夹 ID (编辑/移动/删除时必填) |
| `folder_name` | string | 否 | 收藏夹名称 (添加/编辑时必填) |
| `aid` | string | 否 | 漫画 ID (移动时必填) |

#### `POST {apiUrl}/like` — 点赞/取消点赞

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 目标 ID (漫画/帖子/小说) |
| `like_type` | string | 否 | 类型: `"novel"` 等 |

#### `GET {apiUrl}/watch_list` — 浏览历史列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 是 | 页码 |

**响应 (reducer: `memberReducer.watchList`)**:

```typescript
{
    list: any[],
    total: number
}
```

#### `POST {apiUrl}/watch_list` — 更新浏览历史

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number | 是 | 目标 ID |

#### `GET {apiUrl}/tags_favorite` — 标签收藏列表

**参数**: 无

**响应 (reducer: `memberReducer.tagsList`)**: `{ list: any[] }`

#### `POST {apiUrl}/tags_favorite_update` — 标签收藏更新

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 操作类型 |
| `tags` | string | 是 | 标签 ID 列表 |

---

### 7. 虚拟货币

#### `POST {apiUrl}/coin_buy_charge` — 金币充值

**参数**: 无

#### `POST {apiUrl}/ad_free` — 去广告兑换

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 兑换类型 |

#### `GET {apiUrl}/tasks` — 任务列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 任务类型: `"title"` / `"badge"` / `"coin"` / `"exp"` |
| `filter` | string | 否 | 筛选条件 |

**响应 (reducer: `memberReducer.tasksList`)**:

```typescript
{
    all: any[],     // title/badge 类型任务
    coin: any[],    // 金币任务
    exp: any[],     // 经验任务
    msg: string
}
```

#### `POST {apiUrl}/tasks` — 任务操作

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 任务类型 |
| `uid` | string | 是 | 用户 ID |
| `task_id` | string | 否 | 任务 ID |
| `new_sort_ids` | string | 否 | 新排序 |

#### `POST {apiUrl}/coin` — 金币购买套餐

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `uid` | string | 是 | 用户 ID |
| `task_id` | string | 否 | 套餐 ID |

---

### 8. 小说

#### `GET {apiUrl}/novels` — 小说列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `o` | string | 否 | 排序方式 |
| `t` | string | 否 | 类型筛选 |
| `nid` | string | 否 | 小说 ID (单部查询时) |

**响应 (reducer: `novelReducer.novelList`)**:

```typescript
{
    list: any[],
    total: number
}
```

#### `GET {apiUrl}/novel` — 小说详情

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `o` | string | 否 | 排序 |
| `t` | string | 否 | 类型 |
| `nid` | string | 是 | 小说 ID |

**响应 (reducer: `novelReducer.novelDetail`)**: `Record<string, any>`

#### `GET {apiUrl}/novelchapters` — 小说章节内容

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ncid` | string | 是 | 小说章节 ID |
| `lang` | string | 是 | 语言: `"zh-TW"` / `"zh-CN"` / `"en"` |

**响应 (reducer: `novelReducer.novelReadDetail`)**: `Record<string, any>`

#### `GET {apiUrl}/search_novels` — 小说搜索

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `search_query` | string | 是 | 搜索关键词 |

**响应 (reducer: `novelReducer.novelSearchList`)**:

```typescript
{
    list: any[],
    total: number,
    redirect_aid: string,
    search_query: string
}
```

#### `POST {apiUrl}/like` (novel 模块) — 小说点赞

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 小说 ID |
| `like_type` | string | 是 | `"novel"` |

#### `POST {apiUrl}/comment` (novel 模块) — 小说评论

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nid` | string | 是 | 小说 ID |
| `comment` | string | 是 | 评论内容 |
| `comment_id` | string | 否 | 回复目标评论 ID |
| `ncid` | string | 否 | 关联章节 ID |

#### `POST {apiUrl}/novel_favorites` — 添加小说收藏

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `nid` | string | 是 | 小说 ID |

#### `GET {apiUrl}/novel_favorites` — 小说收藏列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 是 | 页码 |
| `folder_id` | string | 是 | 收藏夹 ID |
| `o` | string | 是 | 排序 |

**响应 (reducer: `novelReducer.novelFavoritesList`)**:

```typescript
{
    list: any[],            // 小说列表
    folder_list: any[],     // 收藏夹列表
    total: number
}
```

#### `POST {apiUrl}/novel_favorites_folder` — 小说收藏夹管理

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 操作类型: `"add"` / `"edit"` / `"move"` |
| `folder_name` | string | 是 | 收藏夹名称 |
| `folder_id` | string | 是 | 收藏夹 ID |
| `nid` | string | 是 | 小说 ID |

#### `POST {apiUrl}/coin_buy_nc` — 金币购买小说章节

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 小说章节 ID |

---

### 9. 游戏

#### `GET {apiUrl}/allgames` — 游戏列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 是 | 页码 |
| `search` | string | 否 | 搜索关键词 |
| `category` | string | 否 | 游戏分类 slug |
| `game_type` | string | 否 | 游戏子分类 slug |

**响应 (reducer: `gamesReducer`)**:

```typescript
{
    games: GamesItem[],
    hotGames: GamesItem[],
    categories: GamesCategory[],
    games_total: number
}

interface GamesItem {
    gid: string;
    title: string;
    description: string;
    tags: string;
    link: string;
    photo: string;
    type: string[];
    categories: { name: string };
}

interface GamesCategory {
    name: string;
    slug: string;
    game_types: { name: string; slug: string; }[];
}
```

#### `GET {apiUrl}/game/{id}` — 游戏详情

**参数**: `id` 通过 URL 路径传入

---

### 10. 视频

#### `GET {apiUrl}/videos` — 视频列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 是 | 页码 |
| `search_query` | string | 否 | 搜索关键词 |
| `video_type` | string | 否 | 视频类型: `"movie"` / `"movie_exclude"` / `"cos"` |

**响应 (reducer: `moviesReducer`)**: 匹配 `video_type="movie_exclude"` 时写入 `exclusiveList`，否则写入 `moviesList`

#### `GET {apiUrl}/latest_hanime` — 最新 H 动漫

**参数**: 无

#### `GET {apiUrl}/video` — 视频详情

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 视频 ID |
| `video_type` | string | 是 | 视频类型: `"cos"` / `"movie"` |

**响应 (reducer: `moviesPlayerReducer.moviesDetail`)**: `Record<string, any>`

#### `GET {apiUrl}/baitu-create-token` — 百度图床 Token

**参数**: 无

---

### 11. 论坛/评论

#### `GET {apiUrl}/forum` — 论坛帖子列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `mode` | string | 是 | 模式: `"all"` / `"manhua"`(漫画评论) / `"chat"`(聊天大厅) / `"novel"`(小说评论) |
| `aid` | string | 否 | 关联漫画 ID |
| `bid` | string | 否 | 关联博客 ID |
| `uid` | string | 否 | 用户 ID |
| `nid` | string | 否 | 关联小说 ID |
| `ncid` | string | 否 | 关联小说章节 ID |
| `page` | int | 否 | 页码 |

#### `POST {apiUrl}/comment` — 发送评论/帖子

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `comment` | string | 是 | 评论内容 |
| `aid` | string | 是 | 关联漫画/文章 ID |
| `bid` | string | 否 | 关联博客 ID |
| `comment_id` | string | 否 | 回复目标评论 ID |

#### `POST {apiUrl}/comment_vote` — 评论投票

(源码中未导出具体 thunk，预计参数: `{ id, vote_type }`)

---

### 12. 创作者/作者

#### `GET {apiUrl}/creator_author` — 创作者列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 是 | 页码 |
| `search_query` | string | 是 | 搜索关键词 |

**响应 (reducer: `creatorReducer.creatorAuthorList`)**:

```typescript
{
    total: number,
    list: any[]
}
```

#### `GET {apiUrl}/creator_work` — 创作者作品列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 是 | 页码 |
| `search_value` | string | 是 | 作者 ID |
| `lang` | string | 是 | 语言 |
| `source` | string | 是 | 来源 |

**响应 (reducer: `creatorReducer.creatorWorkList`)**:

```typescript
{
    total: number,
    list: any[],
    filters: Record<string, any>   // 筛选选项（每个 key 的值数组会前置 "All"）
}
```

#### `GET {apiUrl}/creator_author_work` — 作者作品详情

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 作品 ID |
| `lang` | string | 是 | 语言 |
| `source` | string | 是 | 来源 |

**响应 (reducer: `creatorReducer.creatorAuthorWorkList`)**:

```typescript
{
    list: Record<string, any>,
    filters: Record<string, any>
}
```

#### `GET {apiUrl}/creator_work_info` — 作品信息

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 作品 ID |

**响应**: `response.data.data` (两层 data 嵌套)

#### `GET {apiUrl}/creator_work_info_detail` — 作品详细信息

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 作品 ID |

**响应**: `response.data`

---

### 13. 每日签到

#### `GET {apiUrl}/daily` — 签到信息

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | 是 | 用户 ID |

#### `POST {apiUrl}/daily_chk` — 执行签到

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | 是 | 用户 ID |
| `daily_id` | string | 是 | 签到 ID |

#### `GET {apiUrl}/daily_list` — 签到记录

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | string | 是 | 用户 ID |

**响应 (reducer: `memberReducer.dailyOption`)**: `{ list: any[] }`

#### `POST {apiUrl}/daily_list/filter` — 签到记录筛选

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `data` | string | 是 | 筛选数据(JSON 字符串) |

---

### 14. 通知

#### `GET {apiUrl}/notifications` — 通知列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 否 | 通知类型筛选 |
| `page` | int | 否 | 页码 |

**响应 (reducer: `memberReducer.notificationList`)**:

```typescript
{
    list: any[],
    total: number
}
```

#### `POST {apiUrl}/notifications` — 标记通知已读

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 通知 ID |
| `read` | int | 是 | `1`=已读 |

#### `GET {apiUrl}/notifications/unreadCount` — 未读通知数

**参数**: 无

#### `GET {apiUrl}/album_sertracking` — 专辑追踪查询

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 专辑 ID |

#### `POST {apiUrl}/album_sertracking` — 专辑追踪操作

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 专辑 ID |

#### `POST {apiUrl}/album_tracking` — 专辑追踪列表

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 是 | 页码 |

**响应 (reducer: `memberReducer.trackedList`)**:

```typescript
{
    list: any[],
    total: number
}
```

---

### 15. 用户与设置

#### `GET {apiUrl}/setting` — 获取 App 设置

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `app_img_shunt` | string | 是 | 图片分流策略 (`"0"`/`"1"`) |
| `express` | string | 是 | 加速模式 (`"on"` 或其他) |
| `t` | int | 是 | 当前 unix 时间戳 |

**响应**: `data.main_web_host` 会写入 `localStorage`

#### `POST {apiUrl}/setting` — 保存 App 设置

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `language` | string | 是 | 语言代码 |
| `t` | int | 是 | 当前 unix 时间戳 |

#### `POST {apiUrl}/login` — 用户登录

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 用户名 |
| `password` | string | 是 | 密码 |

**响应**: 返回 `{ jwttoken, ...userInfo }`，自动调用 `saveAuthData()` 存储

#### `POST {apiUrl}/register` — 用户注册

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `username` | string | 是 | 用户名 |
| `password` | string | 是 | 密码 |
| `password_confirm` | string | 是 | 确认密码 |
| `email` | string | 是 | 邮箱 |
| `gender` | string | 是 | 性别 |

#### `POST {apiUrl}/forgot` — 忘记密码

**参数 (FormData)**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `email` | string | 是 | 注册邮箱 |

#### `POST {apiUrl}/logout` — 登出

**参数**: 无

#### `GET {apiUrl}/useredit/{uid}` — 获取用户信息

**参数**: `uid` 通过 URL 路径传入

#### `POST {apiUrl}/useredit/{uid}` — 编辑用户信息

**参数 (FormData)**: 透传用户资料字段

---

### 16. 广告

#### `GET {apiUrl}/advertise` — 获取特定广告位

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | 是 | 广告类型 (`"img"`) |
| `group` | string | 是 | 广告位分组: `"game_banners"`, `"app_movies_top_banner"` 等 |
| `v` | string | 是 | 广告缓存版本号 |

**响应**: `response.data.adv` — 广告列表

#### `GET {apiUrl}/advertise_all` — 广告全覆盖(封面)

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `lang` | string | 否 | 语言 (默认 `"TW"`) |
| `ipcountry` | string | 否 | IP 国家代码 (默认 `"TW"`) |
| `v` | int | 否 | 缓存版本号 |

#### `GET {apiUrl}/ad_content_all` — 全部广告内容

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `adKey` | string | 否 | 广告位 Key (从 `["ad_content_all", "advertise_all"]` 中选择) |
| `lang` | string | 否 | 语言 (`"TW"`) |
| `ipcountry` | string | 否 | IP 国家代码 (`"TW"`) |
| `v` | int | 否 | 缓存版本号 |

---

### 17. 其他

#### `GET {apiUrl}/blogs` — 博客/公告列表

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `page` | int | 是 | 页码 |
| `blog_type` | string | 是 | 博客类型 |

#### `GET {apiUrl}/blog` — 博客详情

**参数**:

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | string | 是 | 博客 ID |

#### `POST {apiUrl}/error_log` — 错误日志上报

**参数 (FormData)**: 透传错误信息

---

## Host 发现机制

### 步骤

1. 请求以下 URL，尝试获取加密的 host 数据：
   - `process.env.REACT_APP_HOST`
   - `process.env.REACT_APP_HOST_BACKUP`
2. 使用 AES-ECB 解密 (密钥: `md5("diosfjckwpqpdfjkvnqQjsik")`)
3. 解析得到 `{ Server: string[], jm3_Server: string }`
4. 从 `Server` 随机挑一个 item → `https://{item}/` 设为 `apiUrl`
5. 从 `jm3_Server` 过滤 `"線路5"` 后随机挑一个 → 设为 `host`

### App 内使用

- `GlobalStore.apiUrl` = localStorage.getItem("apiUrl") — API 请求基础 URL
- `GlobalStore.hostServer` — 服务器列表，用于显示线路名

---

## 组件/页面路由表

| 路由路径 | 组件 | 说明 |
|----------|------|------|
| `/` | `Main` | 首页 |
| `/week` | `Week` | 每周必看 |
| `/search` | `Search` | 搜索 |
| `/comic` | `Comic` | 漫画分类浏览 |
| `/comic/detail` | `Detail` | 漫画详情 |
| `/comic/detail/read` | `Read` | 漫画阅读 |
| `/comic/detail/download` | `Download` | 漫画下载 |
| `/library` | `Library` | 书库(收藏) |
| `/library/list` | `LibraryList` | 收藏夹列表 |
| `/library/list/detail` | `LibraryDetail` | 收藏夹详情 |
| `/categories` | `Categories` | 分类页 |
| `/forum` | `Forum` | 论坛 |
| `/movies` | `Movies` | 视频列表 |
| `/movies/:id` | `MoviesPlayer` | 视频播放 |
| `/games` | `Games` | 游戏列表 |
| `/member` | `Member` | 个人中心 |
| `/daily` | `Daily` | 每日签到 |
| `/novels` | `Novels` | 小说列表 |
| `/novels/detail` | `NovelDetail` | 小说详情 |
| `/novels/detail/read` | `NovelRead` | 小说阅读 |
| `/blogs` | `Blog` | 博客/公告列表 |
| `/blogs/detail` | `BlogsDetail` | 博客详情 |
| `*` | `ErrorPage` | 404 |
| `/test` | `TestComponent` | 测试页面 |

---

## LocalStorage 存储键

| Key | 用途 | 写入位置 |
|-----|------|----------|
| `apiUrl` | API 基础 URL | FETCH_HOST |
| `hostServer` | 服务器列表 JSON | FETCH_HOST |
| `main_web_host` | 分享链接主机名 | FETCH_GET_SETTINGS_THUNK |
| `jwttoken` | JWT 鉴权 Token | FETCH_LOGIN_THUNK / saveAuthData |
| `memberInfo` | 用户信息 JSON | FETCH_LOGIN_THUNK / saveAuthData |
| `fetchHost` | Host 获取方式标记 (`"txt"`/`"backup"`) | FETCH_HOST |
| `imageSource` | 图片来源选择 (`"0"`/`"1"`) | 用户设置 |
| `darkMode` | 深色模式开关 | 用户设置 |
| `lang` | 语言设置 | 用户设置 |
| `adsContent` | 广告内容缓存 | COVER_ADS_FETCH |
| `likedItems` | 已点赞项目列表 | 点赞操作 |
| `novelLikeItems` | 小说点赞列表 | 小说点赞 |
| `novelMarkItems` | 小说收藏列表 | 小说收藏 |
| `novelFontSizeClass` | 小说字体大小 | 阅读设置 |
| `novelLang` | 小说语言 | 阅读设置 |
| `novelRead` | 小说阅读进度 | 阅读操作 |
| `trackList` | 追踪列表 | 追踪操作 |
| `search_history` | 搜索历史 | 搜索操作 |
| `addedMarks` | 已添加收藏标记 | 收藏操作 |
| `removedMarks` | 已取消收藏标记 | 收藏操作 |
