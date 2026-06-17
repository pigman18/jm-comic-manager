const cheerio = require('cheerio');

/**
 * 加载html文档
 * @param html
 * @param options
 * @param isDocument
 * @return {CheerioAPI}
 */
function loadHtml(html, options, isDocument) {
    return cheerio.load(html, options, isDocument);
}

/**
 * 获取要素的文本内容
 * @param $
 * @param eles
 * @param withTrim
 * @return {[]}
 */
function getElementsTexts($, eles, withTrim = true) {
    let texts = [];
    for (let link of (eles || [])) {
        let text = $(link).text();
        if (!!withTrim) {
            text = text.trim()
                .split('\n').join('')
                .split(' ').join('')
        }
        texts.push(text);
    }
    return texts;
}


module.exports = {
    loadHtml,
    getElementsTexts
};
