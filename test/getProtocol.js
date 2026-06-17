const fs = require('node:fs');
const {listFiles} = require('../util/file');

(async () => {
    let obj = {};
    for(let file of listFiles('C:\\jm\\info')) {
        let meta = JSON.parse(fs.readFileSync(file, 'utf-8'));
        for(let key in meta) {
            if (meta.hasOwnProperty(key)) {
                if (!obj.hasOwnProperty(key)) {
                    obj[key] = meta[key];
                } else {
                    if (!!meta[key]) {
                        if (Array.isArray(meta[key])) {
                            if (meta[key].length > 0) {
                                obj[key] = meta[key];
                            }
                        } else {
                            obj[key] = meta[key];
                        }
                    }
                }
            }
        }
    }
    console.log(obj);
})();
