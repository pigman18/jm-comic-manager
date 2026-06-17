// protocol.js 运行协议
'use strict'

/**
 * 任务阶段（我在干什么）
 */
let PHASE = {
    LOGIN: 'login',
    GET_META: 'get_meta',
    FETCH_COMIC: 'fetch_comic',
    FETCH_FILE: 'fetch_file',
    FETCH_COMIC_PAGE: 'fetch_comic_page',
    FETCH_SERIALIZATION: 'fetch_serialization',
    FETCH_COMIC_WEEK: 'fetch_comic_week',
    // local->db, db->local
    SYNC_LOCAL_TO_DB: 'sync_local_to_db',
    SYNC_DB_TO_LOCAL: 'sync_db_to_local',
};

/**
 * 任务子步骤
 */
let STEP = {
    // login
    CHECK_LOGIN_PARAMS: 'check_login_params',
    CLOUD_FLARE_COOKIE: 'cloud_flare_cookie',
    LOGIN_API: 'login_api',
    INDEX_PAGE: 'index_page',
    // fetch comic
    DOWNLOAD_PAGE: 'download_page',
    CAPTCHA: 'captcha',
    REAL_LINK: 'real_link',
    DOWNLOAD: 'download',
    APPEND_COMIC_INFO: 'append_comic_info',
    // fetch file
    FILE: 'file',
    // fetch comic ranking
    FETCH_COMIC_PAGE_DETAILS: 'fetch_comic_page_details',
    // fetch comic week
    FETCH_COMIC_WEEK_LIST: 'fetch_comic_week_list',
    FETCH_COMIC_WEEK: 'fetch_comic_week',
}


/**
 * 运行状态（做到哪了）
 */
let STATE = {
    IDLE: 'idle',       // 还没开始
    WAITING: 'waiting', // 已入队，等执行
    START: 'start',     // 刚开始
    RUNNING: 'running', // 执行中
    SUCCESS: 'success', // 成功
    ERROR: 'error',     // 失败
};

/**
 * 错误码（为什么失败）
 */
let ERR = {
    LOGIN_NO_CREDENTIAL: {code: -10, message: '麻烦填写用户名和密码', status: 502},
    LOGIN_API_FAILED: {code: -11, message: '请求登录接口异常', status: 502},
    LOGIN_EXPIRE: {code: -13, message: '登录信息过期', status: 403},

    INFO_FETCH_FAILED: {code: -20, message: '元信息失败', status: 502},
    INFO_NOT_FOUND: {code: -21, message: '漫画元数据不存在', status: 404},

    COMIC_FETCH_FAILED: {code: -30, message: '下载漫画失败', status: 502},
    COMIC_NOT_FOUND: {code: -31, message: '漫画内容不存在', status: 404},
    RETRY_CAPTCHA_ERROR: {code: -32, message: '验证码错误', status: 502},
    COMIC_PAY_ERROR: {code: -32, message: '收费本下载失败', status: 404},
};

let ApiPath = {
    GetChapter:  "/chapter",
    GetScrambleId: "/chapter_view_template",
    GetFavoriteFolder: "/favorite"
};

/**
 * 漫画元信息
 */
class JmMeta {
    /**
     * 漫画ID
     * @type {string|number}
     */
    id;

    /**
     * 漫画名称
     * @type {string}
     */
    name;

    /**
     * 封面图列表
     * @type {string[]}
     */
    images;

    /**
     * 添加时间（Unix时间戳）
     * @type {number}
     */
    addtime;

    /**
     * 描述/简介
     * @type {string}
     */
    description;

    /**
     * 总浏览数
     * @type {string}
     */
    total_views;

    /**
     * 点赞数
     * @type {string}
     */
    likes;

    /**
     * 章节列表
     * @type {{ id: string, name: string, sort: string }[]}
     */
    series;

    /**
     * 当前章节ID
     * @type {string}
     */
    series_id;

    /**
     * 评论总数
     * @type {string}
     */
    comment_total;

    /**
     * 作者
     * @type {string[]}
     */
    author;

    /**
     * 标签
     * @type {string[]}
     */
    tags;

    /**
     * 作者其他作品
     * @type {string[]}
     */
    works;

    /**
     * 登场角色
     * @type {string[]}
     */
    actors;

    /**
     * 相关推荐
     * @type {{ id: string, author: string, name: string, image: string }[]}
     */
    related_list;

    /**
     * 当前用户是否点赞
     * @type {boolean}
     */
    liked;

    /**
     * 是否收藏
     * @type {boolean}
     */
    is_favorite;

    /**
     * 是否为成人内容
     * @type {boolean}
     */
    is_aids;

    /**
     * 价格（积分）
     * @type {number}
     */
    price;

    /**
     * 购买记录（空串表示未购买）
     * @type {string}
     */
    purchased;

    /**
     * 录入时间（store 专用字段，UNIX 时间戳）
     * @type {number}
     */
    create_time;

    /**
     * 更新时间（store 专用字段，UNIX 时间戳）
     * @type {number}
     */
    update_time;

    constructor(data) {
        this.id = data.id
        this.name = data.name
        this.images = data.images
        this.addtime = data.addtime
        this.description = data.description
        this.total_views = data.total_views
        this.likes = data.likes
        this.series = data.series
        this.series_id = data.series_id
        this.comment_total = data.comment_total
        this.author = data.author
        this.tags = data.tags
        this.works = data.works
        this.actors = data.actors
        this.related_list = data.related_list
        this.liked = data.liked
        this.is_favorite = data.is_favorite
        this.is_aids = data.is_aids
        this.price = data.price
        this.purchased = data.purchased
        this.create_time = data.create_time
        this.update_time = data.update_time
    }
}

/**
 * 漫画搜索元信息
 */
class JmSearchMeta {
    /**
     * 漫画ID
     * @type {string|number}
     */
    id;

    /**
     * 漫画名称
     * @type {string}
     */
    name;

    /**
     * 描述/简介
     * @type {string}
     */
    description;

    /**
     * 作者
     * @type {string[]}
     */
    author;

    /**
     * 标签
     * @type {string[]}
     */
    tags;

    /**
     * 图片
     * @type {string}
     */
    image;

    /**
     * 分类
     * @type {{ id: string, title: string}}
     */
    category;

    /**
     * 子分类
     * @type {{ id: string, title: string}}
     */
    category_sub;

    /**
     * 当前用户是否点赞
     * @type {boolean}
     */
    liked;

    /**
     * 是否收藏
     * @type {boolean}
     */
    is_favorite;

    /**
     * 修改时间
     * @type {number}
     */
    update_at;

    constructor(id, name, description, author, tags, image, category, category_sub, liked, is_favorite, update_at) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.author = author;
        this.tags = tags;
        this.image = image;
        this.category = category;
        this.category_sub = category_sub;
        this.liked = liked;
        this.is_favorite = is_favorite;
        this.update_at = update_at;
    }
}

let SearchSort = {
    // 最新
    Latest: "mr",
    // 最多点击
    View: "mv",
    // 最多图片
    Picture: "mp",
    // 最多爱心
    Like: "tf"
};

/**
 * 每周精選類別項
 */
class JmWeekCategory {
    /**
     * 類別ID
     * @type {string}
     */
    id;

    /**
     * 類別標題
     * @type {string}
     */
    title;

    /**
     * 類別時間範圍
     * @type {string}
     */
    time;

    constructor(id, title, time) {
        this.id = id;
        this.title = title;
        this.time = time;
    }
}

/**
 * 每周精選類型
 */
class JmWeekType {
    /**
     * 類型ID
     * @type {string}
     */
    id;

    /**
     * 類型標題
     * @type {string}
     */
    title;

    constructor(id, title) {
        this.id = id;
        this.title = title;
    }
}

/**
 * 每周必看
 */
class JmWeekInfo {
    /**
     * 期数
     * @type {JmWeekCategory[]}
     */
    categories;

    /**
     * 类型
     * @type {JmWeekType[]}
     */
    type;

    constructor(categories, type) {
        this.categories = categories;
        this.type = type;
    }
}

/**
 * 子分類
 */
class JmSubCategory {
    /**
     * 子分類ID
     * @type {string}
     */
    CID;

    /**
     * 子分類名稱
     * @type {string}
     */
    name;

    /**
     * 子分類 slug
     * @type {string}
     */
    slug;

    constructor(CID, name, slug) {
        this.CID = CID;
        this.name = name;
        this.slug = slug;
    }
}

/**
 * 分類項
 */
class JmCategoryItem {
    /**
     * 分類ID
     * @type {string|number}
     */
    id;

    /**
     * 分類名稱
     * @type {string}
     */
    name;

    /**
     * 分類 slug
     * @type {string}
     */
    slug;

    /**
     * 分類類型（slug / search）
     * @type {string}
     */
    type;

    /**
     * 作品總數
     * @type {string|number}
     */
    total_albums;

    /**
     * 子分類列表
     * @type {JmSubCategory[]}
     */
    sub_categories;

    constructor(id, name, slug, type, total_albums, sub_categories) {
        this.id = id;
        this.name = name;
        this.slug = slug;
        this.type = type;
        this.total_albums = total_albums;
        this.sub_categories = sub_categories;
    }
}

/**
 * 標籤區塊
 */
class JmBlockItem {
    /**
     * 區塊標題
     * @type {string}
     */
    title;

    /**
     * 標籤內容列表
     * @type {string[]}
     */
    content;

    constructor(title, content) {
        this.title = title;
        this.content = content;
    }
}

/**
 * 分類索引資訊
 */
class JmCategoryInfo {
    /**
     * 分類列表
     * @type {JmCategoryItem[]}
     */
    categories;

    /**
     * 標籤區塊列表
     * @type {JmBlockItem[]}
     */
    blocks;

    constructor(categories, blocks) {
        this.categories = categories;
        this.blocks = blocks;
    }
}

module.exports = {
    PHASE,
    STEP,
    STATE,
    ERR,
    ApiPath,
    JmMeta,
    JmSearchMeta,
    SearchSort,
    JmWeekCategory,
    JmWeekType,
    JmWeekInfo,
    JmCategoryItem,
    JmSubCategory,
    JmBlockItem,
    JmCategoryInfo
};
