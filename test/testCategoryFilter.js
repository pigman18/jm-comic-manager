const fs = require('node:fs');
const jmCore = require('../packages/core/src/index');
const categories = require('./categories.json').categories;

(async () => {
    // 1、启动
    await jmCore.start({});
    const timeOptions = [
        { label: '全部', value: 'a' },
        { label: '今天', value: 't' },
        { label: '本周', value: 'w' },
        { label: '本月', value: 'm' },
    ];
    const sortOptionsWeb = [
        { label: '最新', value: 'mr' },
        { label: '最多爱心', value: 'tf' },
        { label: '总排行', value: 'mv' },
        { label: '月排行', value: 'mv_m' },
        { label: '周排行', value: 'mv_w' },
    ];
    const sortOptionsMobile = [
        { label: '最新', value: 'mr' },
        { label: '最多观看', value: 'mv' },
        { label: '最多图片', value: 'mp' },
        { label: '总排行', value: 'tr' },
        { label: '最多评论', value: 'md' },
        { label: '最多爱心', value: 'tf' },
    ];
    let allRequests = [];
    // 2、获取接口内容
    for(let categoryInfo of categories) {
        for(let subCategoryInfo of (categoryInfo.sub_categories || [{
            slug: ''
        }])) {
            let category = categoryInfo.slug;
            let sub_category = subCategoryInfo.slug;
            for(let to of timeOptions) {
                let time = to.value;
                for(let so of [...sortOptionsWeb, ...sortOptionsMobile]) {
                    let order_by = so.value;
                    let res = await jmCore.state.crawler.rank.categoriesFilter(1, time, category, order_by, sub_category);
                    let first10Ids = (res?.content || []).slice(0, 10).map((obj) => obj.id).join(',');
                    let req = {
                        params: {
                            time,
                            category,
                            order_by,
                            sub_category
                        },
                        result: first10Ids
                    };
                    console.log(req);
                    allRequests.push(req);
                }
            }
        }
    }
    fs.writeFileSync('./allRequests.json', JSON.stringify(allRequests, null, 2));
})();
