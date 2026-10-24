'use strict';

/**
 * WebSocket 进度推送
 *   WS /api/ws
 */
module.exports = function registerWsRoutes(app, ctx) {
    const {api, taskManager, progressClients} = ctx;

    app.ws(`${api}/ws`, (ws) => {
        progressClients.add(ws);

        // 连接时下发任务列表与状态定义
        if (taskManager) {
            ws.send(JSON.stringify({
                type: 'init',
                tasks: taskManager.getTasks(),
                statuses: taskManager.getStatuses(),
            }));
        }

        ws.on('message', (raw) => {
            if (!taskManager) return;
            try {
                const msg = JSON.parse(raw.toString());
                if (msg.type === 'ping') return;
                taskManager.handleWSMessage(msg);
            } catch (_) { /* 忽略无法解析的消息 */ }
        });

        ws.on('close', () => progressClients.delete(ws));
    });
};
