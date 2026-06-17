'use strict'

const cheerio = require('cheerio');
const {PHASE} = require("./protocol");
const {isNotEmptySync} = require("../util/file");
const {unZipText} = require("../util/common");
const fs = require("node:fs");

/**
 * 预设的漫画信息分页，可自行在脚本同级的 config/fetchComicPage.json 添加
 * 漫畫        https://18comic.vip/week#comicRanking
 * 漫畫分類     https://18comic.vip/week#comicsCategory
 * @typedef {Object} ComicPage
 * @property {string} label               榜单名称
 * @property {string} url                 基础 URL
 */
/** @type {Record<string, ComicPage>} */
let DEFAULT_COMIC_PAGE = {
  // id = comicRanking
  LATEST: {
    label: '漫畫-最新A漫',
    url: 'https://18comic.vip/albums?o=mr'
  }
};

/**
 * 每周连载更新
 * 这个是固定的
 */
let DEFAULT_SERIALIZATION = {
  SERIALIZATION_0: {
    label: '每周連載更新（已完结）',
    url: 'https://18comic.vip/serialization/0',
  },
  SERIALIZATION_1: {
    label: '每周連載更新（周一）',
    url: 'https://18comic.vip/serialization/1',
  },
  SERIALIZATION_2: {
    label: '每周連載更新（周二）',
    url: 'https://18comic.vip/serialization/2',
  },
  SERIALIZATION_3: {
    label: '每周連載更新（周三）',
    url: 'https://18comic.vip/serialization/3',
  },
  SERIALIZATION_4: {
    label: '每周連載更新（周四）',
    url: 'https://18comic.vip/serialization/4',
  },
  SERIALIZATION_5: {
    label: '每周連載更新（周五）',
    url: 'https://18comic.vip/serialization/5',
  },
  SERIALIZATION_6: {
    label: '每周連載更新（周六）',
    url: 'https://18comic.vip/serialization/6',
  },
  SERIALIZATION_7: {
    label: '每周連載更新（周日）',
    url: 'https://18comic.vip/serialization/7',
  },
};

/**
 * 解析漫画分页
 * 前提：paginated = true
 * @param {string} html 页面 HTML
 * @returns {object}
 */
function parseComicRankingPage(html) {
  const $ = cheerio.load(html);
  const result = {
    list: [],
    pagination: {
      currentPage: 1,
      totalPages: 0,
      hasNext: false,
      nextPageUrl: null,
      totalCount: 0
    }
  };

  // ======================
  // 1. 解析列表数据
  // ======================
  // 选择器说明：
  // - 每个漫画卡片外层： .thumb-overlay-albums 的父级 .p-b-15
  $('.p-b-15.p-l-5.p-r-5').each((_, el) => {
    const $item = $(el);

    const title = $item.find('.video-title').text().trim();
    const url = $item.find('a').first().attr('href') || '';

    const cover =
      $item.find('img.img-responsive').attr('data-original') ||
      $item.find('img.img-responsive').attr('src') ||
      '';

    const author =
      $item.find('.title-truncate.hidden-xs a').first().text().trim() ||
      $item.find('.title-truncate a').first().text().trim();

    const category =
      $item.find('.label-category').text().trim() ||
      $item.find('.category-icon div').first().text().trim();

    const subCategory =
      $item.find('.label-sub').text().trim();

    const likesText =
      $item.find('.label-loveicon span.text-white').text().trim();
    const likes = likesText;

    const tags = [];
    $item.find('.tags .tag').each((_, tag) => {
      tags.push($(tag).text().trim());
    });

    result.list.push({
      aid: Number(url.match(/\/album\/(\d+)/)?.[1]),
      title,
      url,
      cover,
      author,
      category,
      subCategory,
      likes,
      tags
    });
  });

  // ======================
  // 2. 解析分页信息
  // ======================
  const $pagination = $('.pagination');

  // 当前页（active）
  const currentPage = parseInt(
    $pagination.find('li.active span').text().trim(),
    10
  );
  result.pagination.currentPage = Number.isNaN(currentPage) ? 1 : currentPage;

  // 总页数（最后一个数字）
  const pageLinks = $pagination.find('li a');
  let totalPages = 0;
  pageLinks.each((_, el) => {
    const num = parseInt($(el).text().trim(), 10);
    if (!Number.isNaN(num)) totalPages = Math.max(totalPages, num);
  });
  result.pagination.totalPages = totalPages;

  // 下一页
  const $next = $pagination.find('a.prevnext');
  if ($next.length) {
    result.pagination.hasNext = true;
    result.pagination.nextPageUrl = $next.attr('href');
  }

  // 总数提示（如 “10000+ 搜索結果 中 顯示 1 到 80”）
  const countText = $('.well.well-sm').text();
  const match = countText.match(/(\d+)\s*到\s*(\d+)/);
  if (match) {
    result.pagination.totalCount = parseInt(match[2], 10);
  }

  return result;
}

/**
 * 解析每日连载更新列表
 * 前提：paginated = false
 * @param {string} html - 页面 HTML
 * @returns {Array<Object>} 漫画列表
 */
function parseSerializationList(html) {
  const $ = cheerio.load(html);
  const list = [];
  $('.list-item').each((_, el) => {
    const $item = $(el);
    const aid = $item.data('aid');
    const title = $item.find('.video-title').text().trim();
    const url = $item.find('.thumb-overlay-albums > a').attr('href');
    const cover = $item.find('img.lazy_img').attr('data-original');
    const category = $item.find('.label-category').text().trim();
    const subCategory = $item.find('.label-sub').text().trim();
    const latestEp = $item.find('.comic-ep').text().trim();
    const views = $item.find('.fa-eye').next('span').text().trim();
    const likes = $item.find('.label-loveicon span').text().trim();
    list.push({
      aid,
      title,
      url: url?.startsWith('http') ? url : `https://18comic.vip${url}`,
      cover,
      category,
      subCategory,
      latestEp,
      views,
      likes,
    });
  });
  return list;
}

/**
 * 解析 /week 页面的期数列表
 * ✅ 完全基于下拉框
 * ✅ 不做任何日期推算
 */
function parseWeekList(html) {
  const $ = cheerio.load(html);
  const list = [];

  $('.week-time-toggle .week-time-item').each((_, li) => {
    const $li = $(li);
    const $a = $li.find('a').first();

    const href = $a.attr('href') || '';
    const matchId = href.match(/\/week\/(\d+)/);
    if (!matchId) return;

    const weekId = Number(matchId[1]);

    const weekTitle = $li.find('.week-title').text().trim();
    const weekTime = $li.find('.week-time').text().trim();

    /*
     * 2026第239 期 05.15 - 05.08
     */
    const m = weekTime.match(
      /(\d{4})第(\d+)\s*期\s*(\d{2}\.\d{2})\s*-\s*(\d{2}\.\d{2})/
    );
    if (!m) return;

    const year = Number(m[1]);
    const issue = Number(m[2]);
    const end = parseDate(year, m[3]);
    const start = parseDate(year, m[4]);

    const normalWeekTime = weekTime
      .split('\n').join('')
      .split("期").map((s, i) => i === 0 ? s.trim() : s).join("期");
    list.push({
      id: weekId,        // 240 / 239 / 238 ...
      title: weekTitle,
      time: normalWeekTime,
      year,
      issue,         // 第 239 期
      start,
      end,
      startStr: format(start),
      endStr: format(end),
      url: href.startsWith('http')
        ? href
        : `https://18comic.vip${href}`,
    });
  });

  return list;
}

/**
 * 解析 /week 页面中的漫画列表
 * @param {string} html
 * @returns {Array<{
 *   id: number,
 *   title: string,
 *   url: string,
 *   cover: string,
 *   author: string,
 *   views: number,
 *   likes: number,
 *   category: string,
 *   subCategory: string,
 *   tags: string[]
 * }>}
 */
function parseComicWeekList(html) {
  const $ = cheerio.load(html);
  const list = [];

  $('.well.well-sm.d-flex').each((_, el) => {
    const $el = $(el);

    const $link = $el.find('.thumb-overlay-albums > a').first();
    const href = $link.attr('href') || '';
    const match = href.match(/\/album\/(\d+)\//);
    if (!match) return;

    const aid = Number(match[1]);
    const url = href.startsWith('http')
      ? href
      : `https://18comic.vip${href}`;

    const title = $el.find('.video-title').first().text().trim();
    const cover = $el.find('img.img-rounded').first()
      .attr('data-original') || '';
    const author = $el.find('.video-text-block p.title-truncate a')
      .first().text().trim();

    // ✅ views（已修复）
    let views = 0;
    const $block = $el.find('.video-text-block').first();
    const $eye = $block.find('i.fa-eye, i.far.fa-eye');
    if ($eye.length) {
      const $parent = $eye.closest('span');
      const $num = $parent.next('span');
      views = Number($num.text().replace(/,/g, '')) || 0;
    }

    // ✅ likes（按你给的正确写法）
    const $love = $el.find('.label-loveicon');
    const likesText = $love.find('span').last().text().trim();
    const likes = Number(likesText.replace(/,/g, '')) || 0;

    const category = $el.find('.label-category').first().text().trim();
    const subCategory = $el.find('.label-sub').first().text().trim();

    const tags = [];
    $el.find('.tags a.label-category').each((_, tag) => {
      const t = $(tag).text().trim();
      if (t) tags.push(t);
    });

    list.push({
      aid,
      title,
      url,
      cover,
      author,
      views,
      likes,
      category,
      subCategory,
      tags,
    });
  });

  return list;
}

function parseDate(year, str) {
  const [month, day] = str.split('.').map(Number);
  return new Date(year, month - 1, day);
}

function format(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * 解析 JM 漫画详情页 HTML
 * @param {string} html
 */
function parseMeta (html) {
  if (!html) {
    return null;
  }
  const $ = cheerio.load(html)

  // ===== aid =====
  const aid =
    Number($('#album_id').val()) ||
    Number($('input[name="album_id"]').val()) ||
    null

  // ===== 标题 =====
  const title =
    $('#book-name').text().trim() ||
    $('h1.book-name').text().trim() ||
    null

  // ===== 简介 =====
  const description =
    $('.p-t-5.p-b-5[style*="color:#777"]')
      .first()
      .text()
      .replace('敘述：', '')
      .trim() ||
    null

  // ===== 页数 =====
  const pageText =
    $('.train-number .pagecount').text() ||
    $('div:contains("頁數")').text()

  const pageCount = pageText
    ? Number(pageText.match(/\d+/)?.[0])
    : null

  // ===== 上传者 =====
  const uploader =
    $('div:contains("上傳者")')
      .last()
      .text()
      .replace('上傳者：', '')
      .trim() ||
    null

  // ===== 日期 =====
  let publishDate = null
  let updateDate = null

  $('.col-xs-12 p.float-left, .col-xs-12 p.float-right').each((_, el) => {
    const t = $(el).text().trim()
    if (t.includes('上架')) {
      publishDate = t.replace(/.*[:：]/, '').trim()
    }
    if (t.includes('更新')) {
      updateDate = t.replace(/.*[:：]/, '').trim()
    }
  })

  // ===== 观看数 =====
  let views = null
  $('*').each((_, el) => {
    const t = $(el).text().trim()
    if (t.includes('次觀看')) {
      const m = t.match(/([\d.]+[MKmk]?)\s*次觀看/)
      if (m) {
        views = m[1]
        return false
      }
    }
  })

  // ===== 点赞数 =====
  const likesText =
    $(`#albim_likes_${aid}`).text() ||
    $('.fa-thumbs-up').parent().text()

  const likes = likesText
    ? likesText.match(/([\d.]+[Kk]?)/)?.[1] || null
    : null

  // ===== 封面 =====
  let cover = null
  $('#album_photo_cover .thumb-overlay img').each((_, el) => {
    const src = $(el).attr('src')
    if (
      src &&
      src.includes('/albums/') &&
      !src.includes('blank.jpg')
    ) {
      cover = src
      return false
    }
  })

  // ===== 缩略图 =====
  const thumbs = []
  $('img[data-src]').each((_, el) => {
    const src = $(el).attr('data-src')
    if (
      src &&
      src.includes('/photos/') &&
      src.endsWith('.webp') &&
      !src.includes('blank.jpg')
    ) {
      if (!thumbs.includes(src)) thumbs.push(src)
    }
  })

  if (thumbs.length === 0) {
    $('img[itemprop="image"]').each((_, el) => {
      const src = $(el).attr('src')
      if (
        src &&
        src.includes('/photos/') &&
        src.endsWith('.webp') &&
        !src.includes('blank.jpg')
      ) {
        if (!thumbs.includes(src)) thumbs.push(src)
      }
    })
  }

  // ===== 标签（原逻辑保留） =====
  const allTags = []
  $('span[itemprop="genre"] a, .tag-block a.btn').each((_, el) => {
    const t = $(el).text().trim()
    if (t && !allTags.includes(t)) allTags.push(t)
  })

  // ===== ✅ 新增：tags（来源严格限定） =====
  const tags = []
  $('a[name="vote_"].web-tags-tag').each((_, el) => {
    const t = $(el).text().trim()
    if (t && !tags.includes(t)) tags.push(t)
  })

  // ===== 作者 =====
  const authors = []
  $('span[itemprop="author"] a').each((_, el) => {
    const a = $(el).text().trim()
    if (a && !authors.includes(a)) authors.push(a)
  })

  // ===== 关键字 =====
  const keywords = $('meta[name="keywords"]').attr('content')

  // ===== 子章节 =====
  const episodes = []
  $('.episode ul li, .btn-toolbar li').each((_, el) => {
    const $li = $(el)
    const text = $li.find('.h2_series').text().trim()
    const href = $li.closest('a').attr('href') || ''
    const match = href.match(/\/photo\/(\d+)/)

    episodes.push({
      index: episodes.length,
      title: text.split('\n')[0] || null,
      aid: match ? Number(match[1]) : undefined
    })
  })

  return {
    aid,
    title,
    description,
    pageCount,
    uploader,
    publishDate,
    updateDate,
    views,
    likes,
    cover,
    thumbs,
    allTags,
    tags,      // ✅ 新增返回字段
    authors,
    keywords,
    episodes
  }
}

/**
 * 从字符串中解析出数字
 * 例：和网友りぶつ在14天里看了39局对战胜率达到百分之36用时3分钟的比赛录像
 * 返回：1439363
 * @param {string} text
 * @returns {number}
 */
function parseNumberFromText(text) {
  let result = '';

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch >= '0' && ch <= '9') {
      result += ch;
    }
  }

  if (result === '') {
    throw new Error('no number found');
  }

  return Number(result);
}

function parseNumber (number) {
  let originNumber = number;
  if ('number' !== typeof (number)) {
    try {
      number = Number(number);
    } catch (_) {
      number = NaN;
    }
  }
  if (isNaN(number)) {
    try {
      number = parseNumberFromText(originNumber);
      number = Number.parseInt(number);
    } catch (e) {
      throw new Error(`无法识别的编码：${originNumber}`);
    }
  }
  return number;
}


module.exports = {
  DEFAULT_COMIC_PAGE,
  DEFAULT_SERIALIZATION,
  parseComicRankingPage,
  parseSerializationList,
  parseWeekList,
  parseComicWeekList,
  parseMeta,
  parseNumber
};
