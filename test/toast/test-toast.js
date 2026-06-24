const fs = require('fs');
const path = require('path');
const {resolveAppId} = require('../../packages/core/util/app');

/**
 * 可替换变量 ↓↓↓
 */
const appId = resolveAppId('com.pigman18.jmcomicmanager'); // ✅ 借用系统 AppId
const titleIcon = 'C:\\code\\jm-comic-manager\\resources\\icon.png';      // 左侧小图标
const messageIcon = 'F:\\jm\\file\\media\\albums\\1448262.jpg';    // 内容区大图（Hero）


(async () => {
    // powertoast 新版多为 ESM，CommonJS 环境推荐用动态 import 兼容
// 如果装的是旧版 CJS 版本可直接 const toast = require('powertoast');
    async function main() {
        // 兼容 ESM/CJS 加载
        let toast = require('powertoast');
        console.log('发送通知...');
        //Create a toast
        await toast({
            appID: appId,          // ✅ 核心：支持自定义 AppId
            title: '✅ 下载完成',
            message: '这是纯 PowerShell 实现的通知，无额外 EXE\n支持自定义图标和按钮',
            icon: titleIcon,
            headerImg: messageIcon
        })
    }

    main();
})();
