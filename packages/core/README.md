# jm-comic-manager core — API Coverage

对比 jm-api（禁漫天堂官方 App/Web 的 TypeScript 源码）中定义的全部接口，记录 crawler.js 中的实现状态。

## 已实现

| 功能 | API 路径 | 爬虫方法 | 服务端路由 |
|------|---------|---------|-----------|
| 登录 | `login` | `account.login()` | `POST /api/login` |
| 退出 | `logout` | — | `POST /api/logout` |
| 每日签到 | `daily_chk` | `account.sign()` | `POST /api/account/sign` |
| 漫画搜索 | `search` | `search.byKeyword()` | `GET /api/search/comics` |
| 热门标签 | `hot_tags` | `search.hotTags()` | `GET /api/search/hot-tags` |
| 随机推荐 | `random_recommend` | `search.randomRecommend()` | `GET /api/search/random-recommend` |
| 漫画详情 | `album` | `comic.getMeta()` | `POST /api/comics/:num/fetch-meta` |
| 漫画下载 | `album_download_2` | `comic.downloadArchive()` | 通过 taskManager 内部调用 |
| 收藏列表 | `favorite` | `account.getFavorites()` | `GET /api/favorites/comics` |
| 收藏操作 | `favorite` (add/del) | `account.addFavorite()` / `removeFavorite()` | `POST /api/favorites/comics/:num/toggle` |
| 收藏文件夹 | `favorite_folder` | `account.createFolder/renameFolder/deleteFolder/moveToFolder` | `POST /api/favorites/folder` |
| 论坛/评论列表 | `forum` | `forum.feed()` / `forum.list()` / `forum.byUser()` | `GET /api/forum/list`, `GET /api/forum` |
| 发表评论 | `comment` | `forum.post()` | `POST /api/comment` |
| 分类列表 | `categories` | `rank.categories()` | `GET /api/category/info` |
| 分类筛选 | `categories/filter` | `rank.categoriesFilter()` | `GET /api/category/filter` |
| 每周必看 | `week` | `rank.weekInfo()` | `GET /api/week/info` |
| 每周筛选 | `week/filter` | `rank.weekly()` | `GET /api/week/comics` |
| 每日连载 | `serialization` | `rank.serialization()` | `GET /api/serial/comics` |
| 最新发布 | `latest` | `rank.latest()` | `GET /api/latest/comics` |
| 推广列表 | `promote` / `promote_list` | `promote.list()` / `promoteList()` | `GET /api/promote` |

---

## 未实现

按功能和开发优先级分组。

### 高价值（与现有功能互补）

| 功能 | API 路径 | 参数 | 说明 |
|------|---------|------|------|
| **评论投票** | `comment_vote` | POST: `{ cid, vote }` | 评论顶/踩，刚做完评论回复就差投票了 |
| **浏览历史** | `watch_list` | GET: `{ page }` | 获取用户浏览历史列表 |
| **通知列表** | `notifications` | GET: `{ type?, page? }` | 通知列表 |
| **通知未读数** | `notifications/unreadCount` | GET: 无参数 | 未读通知数，侧边栏可显示小红点 |
| **站点公告** | `blogs` | GET: `{ page, blog_type }` | 公告列表 |
| **公告详情** | `blog` | GET: `{ id }` | 单条公告详情 |
| **热门标签收藏** | `tags_favorite` / `tags_favorite_update` | GET/POST | 收藏标签 |

### 中等价值

| 功能 | API 路径 | 参数 | 说明 |
|------|---------|------|------|
| **收藏文件夹管理（完善）** | `favorite_folder` | 已有 CRUD，缺 GET folders 独立端点 | 目前文件夹数据随 favorites 列表返回 |
| **用户信息编辑** | `useredit` | GET/POST: `{ uid }` | 编辑个人资料 |
| **注册** | `register` | POST: `{ username, password, email, gender }` | 注册新账号 |
| **忘记密码** | `forgot` | POST: `{ email }` | 找回密码 |
| **追更列表** | `album_tracking` | POST: `{ page }` | 正在追更的漫画列表 |
| **追更设置** | `album_sertracking` | GET/POST: `{ id }` | 设置/取消追更 |

### 低价值 / 冷门功能

| 功能 | API 路径 | 说明 |
|------|---------|------|
| **小说** | `novels`, `novel`, `novelchapters`, `search_novels`, `novel_favorites`, `novel_favorites_folder`, `coin_buy_nc` | 小说完全独立体系 |
| **视频** | `videos`, `latest_hanime`, `video`, `baitu-create-token` | 视频/H动画完全独立 |
| **游戏** | `allgames`, `game` | 游戏完全独立 |
| **创作者/同人作者** | `creator_author`, `creator_work`, `creator_author_work`, `creator_work_info`, `creator_work_info_detail` | 作者搜索与作品列表 |
| **任务/成就** | `tasks`, `coin` | 成就系统和金币购买 |
| **每日列表** | `daily_list`, `daily_list/filter` | 签到额外选项 |
| **金币购买** | `coin_buy_comics`, `coin_buy_charge`, `coin_buy_nc` | 金币消费 |
| **去广告** | `ad_free` | 购买去广告 |
| **错误日志** | `error_log` | 向服务端报告错误 |
| **广告内容** | `ad_content_all`, `advertise_all`, `advertise` | 各类广告位 |
| **App 设置** | `setting` | App 设置同步 |

---

## 未在 service 中暴露但爬虫已有的方法

- `crawler.comic.downloadArchive()` — 通过 taskManager 内部调用，无独立路由
- `crawler.comic.appendComicInfo2Archive()` — 下载完成的回调中调用
- `crawler.fetchLatestApiHosts()` — 启动时内部调用

---

## `crawler.js` 模块结构

```
createCrawler(manifest, ctx, message, config) → {
  httpClient, close, init, fetchRemoteFile, fetchLatestApiHosts,
  account: { login, sign, getFavorites, addFavorite, removeFavorite,
             createFolder, renameFolder, deleteFolder, moveToFolder },
  comic:   { getMeta, downloadArchive, appendComicInfo2Archive },
  search:  { byKeyword, hotTags, randomRecommend },
  rank:    { weekInfo, weekly, serialization, categories,
             categoriesFilter, latest },
  forum:   { feed, list, byUser, post },
  promote: { list, sections, promoteList },
}
```
