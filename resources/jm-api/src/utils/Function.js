import md5 from "md5";
import { t } from "i18next";
import CryptoJS from "crypto-js";

// 產生簡單加法題目
export const generateMathProblem = () => {
  const num1 = Math.floor(Math.random() * 100) + 1;
  const num2 = Math.floor(Math.random() * 10) + 1;

  const problem = `${num1} + ${num2}`;
  const answer = num1 + num2;

  return {
    problem,
    answer: answer.toString(),
  };
};

//數字轉日期時間
export function formatTimestampToDate(timestamp) {
  const validTimestamp = (timestamp || 0) * 1000;
  const date = new Date(validTimestamp);
  return date.toISOString().slice(0, 10);
}

// 分割陣列
export const chunkArray = (arr, size) => {
  const result = [];
  for (let i = 0; i < arr?.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
};
// 隨機item & index
export function getRandomItems(arr, count = 1) {
  if (!Array.isArray(arr) || arr.length === 0) {
    return { items: [], indexes: [] };
  }
  const maxCount = Math.min(count, arr.length);
  const shuffled = [...arr].sort(() => Math.random() - 0.5);
  const result = shuffled.slice(0, maxCount);
  const indexes = result.map((item) => arr.indexOf(item));
  return { items: result, indexes };
}

// 計算幾天前
export const getDateDiffFromNow = (time) => {
  const now = Date.now();
  const updated = time * 1000;
  const diffMs = now - updated;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  return diffDays;
};

// yyyy/mm/dd 上午/下午 hh:mm:ss
export const getTaipeiTimeString = () => {
  const now = new Date();
  const formatted = now.toLocaleString("zh-TW", {
    timeZone: "Asia/Taipei",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return formatted;
};

// HH:MM
export const getCurrentTime = () => {
  let now = new Date();
  let hours = now.getHours().toString().padStart(2, "0");
  let minutes = now.getMinutes().toString().padStart(2, "0");
  return `${hours}:${minutes}`;
};
// HH:MM:SS
export const getToday = () => {
  let now = new Date();
  let hours = now.getHours().toString().padStart(2, "0");
  let minutes = now.getMinutes().toString().padStart(2, "0");
  let seconds = now.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}`;
};

export const getWeekInfo = (weekDayItems) => {
  const rawIndex = new Date().getDay();
  const todayIndex = rawIndex === 0 ? 6 : rawIndex - 1;
  const weekDays = weekDayItems;
  return {
    today: weekDays[todayIndex],
    todayIndex: todayIndex + 1,
    allDays: weekDays,
  };
};

export const getMarkColor = (type) => {
  switch (type) {
    case "fanbox":
      return { backgroundColor: "#5abee8" };
    case "fantia":
      return { backgroundColor: "#3c7620" };
    case "gumroad":
      return { backgroundColor: "#fc92e9" };
    case "patreon":
      return { backgroundColor: "#c23f2b" };
    case "subscribestar":
      return { backgroundColor: "#56b8ac" };
    default:
      return { backgroundColor: "#3c7620" };
  }
};

export const renderText = (pullStatus, percent) => {
  switch (pullStatus) {
    case "pulling":
      return t("renderText.pulling");

    case "canRelease":
      return t("renderText.canRelease");

    case "refreshing":
      return t("renderText.refreshing");

    case "complete":
      return t("renderText.complete");

    default:
      return "";
  }
};

let CommonUtil = {
  fomatFloat: (src, pos) => {
    let unit_str = "";
    if (src < 1000) {
      return src;
    }
    src = src / 1000;
    unit_str = "K";
    if (src > 100) {
      src = src / 100;
      unit_str = "M";
    }

    return Math.round(src * Math.pow(10, pos)) / Math.pow(10, pos) + unit_str;
  },
  modifyData: (data, column = 3, bannerRow = 6, banners = []) => {
    const numColumns = column;
    const addBannerIndex = bannerRow;
    const section = [];
    var items = [];

    data &&
      data.forEach((val, index) => {
        if (index % numColumns == 0 && index != 0) {
          section.push(items);
          items = [];
        }
        if (banners.length > 0 && index % addBannerIndex == 0 && index != 0) {
          section.push({ type: "banner", info: banners });
          items = [];
        }
        items.push(val);
      });
    section.push(items);
    return section;
  },

  // ex: comic18://Detail/id/111
  redirectToScreen: (origin_url) => {
    let url = origin_url.split("/");
    if (url.length >= 3);
    {
      let screen = url[2];
      let params = {};
      url.splice(0, 3);
      let urlParams = url;
      urlParams.forEach((value, index) => {
        if (value && urlParams[index + 1]) {
          params[value] = urlParams[index + 1];
        }
      });

      // RootNavigation.navigate(screen, params)
    }
  },
};

const key = CryptoJS.enc.Utf8.parse(md5("diosfjckwpqpdfjkvnqQjsik"));

export const decryptData = (encryptedText) => {
  try {
    const decrypted = CryptoJS.AES.decrypt(encryptedText, key, {
      mode: CryptoJS.mode.ECB,
    });
    return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
  } catch (err) {
    console.log("解密失敗:", err);
    return null;
  }
};

//(圖片先設了display:none)
//還原被切的圖 並畫到它後面的canvas
export function scramble_image(img, aid, scramble_id, page) {
  //GIF和舊漫沒切不用還原 直接改顯示
  if (img.src.indexOf(".gif") > 0 || parseInt(aid) < parseInt(scramble_id)) {
    if (img.style.display === "none") {
      img.style.display = "block";
    }
    return;
  }
  var num = get_num(window.btoa(aid), window.btoa(page));
  onImageLoaded(img, num);
}

function onImageLoaded(img, num) {
  var canvas;
  canvas = document.createElement("canvas");
  img.after(canvas);

  var ctx = canvas.getContext("2d");
  var s_w = img.width;
  var w = img.naturalWidth;
  var h = img.naturalHeight;
  canvas.width = w;
  canvas.height = h;

  if (s_w > img.parentNode.offsetWidth || s_w == 0) {
    s_w = img.parentNode.offsetWidth;
  }
  canvas.style.width = s_w + "px";
  canvas.style.display = "block";

  num = parseInt(num);
  var remainder = parseInt(h % num);
  var copyW = w;

  for (var i = 0; i < num; i++) {
    var copyH = Math.floor(h / num);
    var py = copyH * i;
    var y = h - copyH * (i + 1) - remainder;

    if (i == 0) {
      copyH = copyH + remainder;
    } else {
      py = py + remainder;
    }

    ctx.drawImage(img, 0, y, copyW, copyH, 0, py, copyW, copyH);
  }
}

function get_num(aid, page) {
  aid = window.atob(aid);
  page = window.atob(page);

  var num = 10;
  var key = aid + page;
  key = md5(key);
  key = key.substr(-1);
  key = key.charCodeAt();

  if (parseInt(aid) >= window.atob("MjY4ODUw") && parseInt(aid) <= window.atob("NDIxOTI1")) {
    key = key % 10;
  } else if (parseInt(aid) >= window.atob("NDIxOTI2")) {
    key = key % 8;
  }

  switch (key) {
    case 0:
      num = 2;
      break;
    case 1:
      num = 4;
      break;
    case 2:
      num = 6;
      break;
    case 3:
      num = 8;
      break;
    case 4:
      num = 10;
      break;
    case 5:
      num = 12;
      break;
    case 6:
      num = 14;
      break;
    case 7:
      num = 16;
      break;
    case 8:
      num = 18;
      break;
    case 9:
      num = 20;
      break;
  }

  return num;
}

export default CommonUtil;
