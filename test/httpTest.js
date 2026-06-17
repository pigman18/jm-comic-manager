const axios = require('axios');
const {saveAxiosResponse, downloadResume} = require('../util/http');

(async () => {
    let url = 'https://dl2025.cdnhjk.net/download_zip?md5=zamVAux5_DziIppcMx48ag&expires=1781660892&aid=114514&uid=5303718';
    let filePath = 'C:\\jm\\comic\\114514.zip';
    let proxy = 'http://127.0.0.1:10809';
    await downloadResume(url, filePath, {
        proxy: proxy,
        onProgress: ({complete, total}) => {
            console.log(`下载进度：${complete} / ${total}`);
        }
    });
})();
