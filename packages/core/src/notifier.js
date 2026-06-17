const notifier = require('node-notifier')

notifier.notify({
    title: 'JM 下载完成',
    message: '《XXX 漫画》已下载完毕',
    icon: './icon.png',
    sound: true,
    wait: true,
});

module.exports = {
    notify
}