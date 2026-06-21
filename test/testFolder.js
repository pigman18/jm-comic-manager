(async() => {
    const { pickFile, pickDirectory } = require('node-fs-dialogs');
    const filePath = await pickFile({
        filters: [
            {
                name: '选择漫画阅读器',
                extensions: ['exe']
            }
        ],
        defaultPath: 'C:\\Program Files\\ComicRack\\ComicRack.exe'
    });
    const folderPath = await pickDirectory();
    console.log(filePath, folderPath);
})();