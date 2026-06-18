(async () => {
    const { create_window, expose, start } = require('ewvjs')
    const { Tray } = require('@trayjs/trayjs')

// ===== 暴露给前端调用的 API =====
    expose('platform', () => process.platform)
    expose('ping', () => 'pong')

// ===== 创建窗口 =====
    const win = await create_window('My EWVJS App', 'index.html', {
        width: 900,
        height: 600,
        center: true,
        resizable: true
    })

    win.run()

// ===== 系统托盘 =====
    let visible = true

    const tray = new Tray({
        tooltip: 'EWVJS App',
        icon: {
            png: '../resources/icon.png',
            ico: '../resources/icon.ico'
        },
        onMenuRequested: function () {
            return [
                { id: 'toggle', title: visible ? '隐藏窗口' : '显示窗口' },
                { separator: true },
                { id: 'quit', title: '退出' }
            ]
        },
        onClicked: function (id) {
            if (id === 'toggle') {
                visible ? win.hide() : win.show()
                visible = !visible
            }
            if (id === 'quit') {
                tray.quit()
                win.close()
                process.exit(0)
            }
        }
    })

    tray.on('close', () => process.exit(0))

// ===== 启动事件循环 =====
    start()
})();
