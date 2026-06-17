/**
 * 获取响应的字符串cookie
 * @param resp {AxiosResponse}             axios响应对象
 * @return {string}         cookie字符串
 */
function getAxiosResponseCookie(resp) {
  return (resp.headers['set-cookie'] || [])
    .map(c => c.split(';')[0])
    .join('; ')
}

/**
 * map转cookie
 * @param cookieMap
 * @return {string}
 */
function cookieMap2Cookie(cookieMap) {
  return Object.keys(cookieMap).filter((key) => {
    return [
      'HTTPONLY',
      'SAMESITE',
      'PARTITIONED',
      'SECURE',
      'PATH',
      'DOMAIN',
      'EXPIRES',
      'MAX-AGE',
    ].indexOf(key.toUpperCase()) === -1;
  }).map((key) => {
    return key + "=" + cookieMap[key]
  }).join("; ");
}

/**
 * cookie转map
 * @param cookie
 * @return {{}}
 */
function cookie2CookieMap(cookie) {
  let map = {};
  if (!cookie) {
    return map;
  }
  for (let str of cookie.split(';')) {
    let k = str.split('=')[0].trim();
    let v = str.split('=')[1];
    if (!!k) {
      map[k] = v;
    }
  }
  return map;
}

/**
 * 合并cookie
 * @param cookies
 */
function getExpires(cookies) {
  cookies = cookies || [];
  let expires = -1;
  let maxAge = -1;
  try {
    for (let cookie of cookies) {
      let cookieMap = cookie2CookieMap(cookie);
      if (-1 === expires && cookieMap.hasOwnProperty('expires')) {
        expires = new Date(cookieMap['expires']).getTime();
      }
      if (-1 === maxAge && cookieMap.hasOwnProperty('Max-Age')) {
        maxAge = Number.parseInt(cookieMap['Max-Age']);
      }
    }
  } catch (e) {
  }
  return {
    expires,
    maxAge
  };
}

/**
 * 合并cookie
 * @param oldCookie
 * @param newCookie
 */
function mergeCookie(oldCookie, newCookie) {
  oldCookie = oldCookie || '';
  newCookie = newCookie || '';
  let cookieMap1 = cookie2CookieMap(oldCookie);
  let cookieMap2 = cookie2CookieMap(newCookie);
  let newCookieMap = {
    ...(cookieMap1 || {}),
    ...(cookieMap2 || {})
  };
  delete newCookieMap['expires'];
  delete newCookieMap['Max-Age'];
  delete newCookieMap['path'];
  return cookieMap2Cookie(newCookieMap);
}


module.exports = {
  getAxiosResponseCookie,
  mergeCookie,
  cookie2CookieMap,
  cookieMap2Cookie,
  getExpires
};
