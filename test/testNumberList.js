const fs = require('node:fs');
const {listFiles, getBaseName} = require('../packages/core/util/file');

(async () => {
    let numbers = Array.from({ length: 1600000 - 1 + 1 }, (_, i) => 1 + i);
    let complete = 0;
    numbers = numbers.filter((number) => {
        let flag = !fs.existsSync(`C:\\jm\\info\\${number}.json`);
        complete += 1;
        console.log(`进度：${complete} / ${numbers.length}`);
        return flag;
    });
    fs.writeFileSync('./fetchInfo.json', JSON.stringify(numbers));
})();
