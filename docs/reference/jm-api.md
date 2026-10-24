# JM 主站 API 文档

## 接口规则

- 基础域名：`apiHost` 从 `/settings` 配置获取（例如 `https://www.cdngwc.cc`）
- 认证：`Authorization: Bearer {token}` + `token`（MD5(时间戳+密钥)）+ `tokenparam`（时间戳,版本号）
- 加密：响应体 `data` 字段为 AES-ECB 加密 JSON，由 crawler apiClient 自动解密

## 推广 /promote

### GET /promote
首页推广 sections 列表。

```json
[{
  "id": "26",
  "title": "连载更新",
  "slug": "serial",
  "type": "promote",
  "filter_val": "5",
  "content": [{ "id": "1444583", "author": "...", "name": "...", "image": "/media/albums/...jpg", "category": {...}, "liked": false, "is_favorite": false, "update_at": "1782456690" }]
}]
```

- `type=promote` → `filter_val` 是 promote_list 的 id
- `type=not_in_category_id` / `type=category_id` → `slug` 是分类排行的 category 参数
- `type=library` / `type=novels` → 暂未实现

## 推广列表 /promote_list

### GET /promote_list?id={id}&page={page}
推广列表分页数据。

- **id**: 10-38，含义待确认
- **page**: 从 **0** 开始（crawler 入参 page 从 1 开始，内部 -1 兼容）

```json
{
  "total": "3108",
  "list": [{ "id": "1433787", "author": "...", "name": "...", "category": {...}, "is_favorite": false, "update_at": 1782439444 }]
}
```

- 有 `total` 字段 → 传统分页
- 每页 27 条

## 论坛 /forum

### GET /forum?mode={mode}&page={page}
论坛主 feed，按模式分页。

- **mode**: `all`（全部）| `manhua`（漫画）| `chat`（闲聊）
- **page**: 从 **1** 开始
- 有 `total` 字段（上限 5000）→ 传统分页
- 每页 10 条

```json
{
  "total": 5000,
  "list": [{
    "AID": "1447840",         // 关联漫画 ID，"0" 表示无关联
    "CID": "10696468",        // 评论 ID
    "UID": "15909670",        // 用户 ID
    "username": "muzou45",
    "nickname": "muzou45",
    "likes": "0",
    "gender": "Male",
    "addtime": "Jun 27, 2026", // 已格式化时间字符串
    "update_at": "0",
    "parent_CID": "0",        // 父评论 ID，"0" 为顶层
    "expinfo": {              // 等级信息
      "level_name": "地上的月影",
      "level": 4,
      "nextLevelExp": 2100,
      "exp": "1695",
      "expPercent": 80.71,
      "badges": []
    },
    "name": "JM1447840",      // 显示名，AID≠0 时为 "JM{AID}"
    "content": "<div>...</div>", // HTML 内容
    "photo": "nopic-Male.gif",  // 头像文件名
    "spoiler": "1"             // 是否含剧透
  }]
}
```

### GET /forum?mode=all&page={page}&aid={aid}
漫画详情页评论。

- 多出 `replys` 字段（内嵌回复列表）
- 其他字段同上

### POST /comment
发表评论。

- Body: `comment`（文本）+ `aid`（漫画 ID）
- 使用 FormData
