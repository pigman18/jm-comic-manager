const path = require('path');
const fs = require('fs');

(async () => {
    const { notify } = await import('@agentine/herald');
    const iconPath = path.resolve(__dirname, '../../resources/icon.png'); // 或 icon.ico
    console.log(fs.existsSync(iconPath));
    await notify({
        title: 'Herald 借用 AppId',
        message: '<div>123</div>现在应该能正常弹出通知了',
        icon: iconPath,
        appId: '{7C5A40EF-A0FB-4BFC-874A-C0F2E0B9FA8E}\\JM漫画管理器\\JM漫画管理器.exe', // ✅ 关键
        timeout: 10,
        sound: true
    });
    console.log('✅ 通知已发送');
})();
