'use strict'

const fs = require('node:fs');
const path = require('node:path');
const toast = require('powertoast');

const { PHASE, STATE, STEP } = require('./protocol');
const {saveB64Image} = require('../util/app');

const STATUSES = [
    { status: 'downloading', label: '下载中', icon: 'CloudDownloadOutline', color: '#1BA784' },
    { status: 'paused',      label: '已暂停', icon: 'PauseCircleOutline',  color: '#FFC300' },
    { status: 'completed',   label: '已完成', icon: 'CheckmarkCircleOutline', color: '#18a058' },
    { status: 'waiting',     label: '等待中', icon: 'TimeOutline',        color: '#909399' },
    { status: 'error',       label: '错误',   icon: 'CloseCircleOutline', color: '#d03050' },
];

/** 根据 step / stepState 生成复合状态描述 */
function stepStatusLabel(step, stepState, stepLabels, payload) {
    if (!step) return null;
    const stepName = (stepLabels && stepLabels[step]) || step.replace(/_/g, ' ');
    if (stepState === 'start') return { label: `${stepName}`, icon: 'CloudDownloadOutline', color: '#4fc1e9' };
    if (stepState === 'running') return { label: `${stepName}`, icon: 'CloudDownloadOutline', color: '#1BA784' };
    if (stepState === 'success') return { label: `${stepName}完成`, icon: 'CheckmarkCircleOutline', color: '#18a058' };
    if (stepState === 'error') {
        if (payload?.error && payload?.error?.message) {
            return { label: `${payload.error.message}`, icon: 'CloseCircleOutline', color: '#d03050' };
        }
        return { label: `${stepName}失败`, icon: 'CloseCircleOutline', color: '#d03050' };
    }
    return null;
}


function createTaskManager(manifest, ctx, store, crawler, message, config) {
    const stepLabels = manifest.themeDetail?.step || {};
    const dataDir = config.dataDir || path.join(manifest.workspace, 'data');
    const tasksFile = path.join(dataDir, 'tasks.json');

    let tasks = [];
    let serverRef = null;

    const _taskbar = (() => {
        try {
            const { loadEmbedded } = require('taskbar-progress/embed/loader.js');
            return loadEmbedded();
        } catch { return null }
    })();

    function setProgress(value) { try { _taskbar?.setProgress(value) } catch {} }
    function setIndeterminate() { try { _taskbar?.setIndeterminate() } catch {} }
    function setError() { try { _taskbar?.setError() } catch {} }

    function setServer(server) { serverRef = server; }

    function broadcast(msg) {
        if (serverRef && typeof serverRef.sendMessage === 'function') {
            serverRef.sendMessage(msg);
        }
    }

    function loadTasks() {
        try {
            if (fs.existsSync(tasksFile)) {
                tasks = JSON.parse(fs.readFileSync(tasksFile, 'utf-8'));
                tasks = tasks.filter(t => t.status !== 'removed');
                tasks.forEach(t => {
                    if (t.status === 'downloading') { t.status = 'paused'; t.speed = 0; t.downloadedSize = 0; t.progress = 0; }
                });
                console.log(`[taskManager] 加载 ${tasks.length} 个任务`);
            }
        } catch (e) {
            console.error('[taskManager] 加载失败:', e.message);
            tasks = [];
        }
    }

    let _saveTimer = null;
    function saveTasks() {
        if (_saveTimer) clearTimeout(_saveTimer);
        _saveTimer = setTimeout(() => {
            _saveTimer = null;
            _writeTasks();
        }, 200);
    }
    function flushTasks() {
        if (_saveTimer) { clearTimeout(_saveTimer); _saveTimer = null; }
        _writeTasks();
    }
    function _writeTasks() {
        const dir = path.dirname(tasksFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        const active = tasks.filter(t => t.status !== 'removed').map(t => {
            const { _afterSteps, ...rest } = t;
            return rest;
        });
        fs.writeFileSync(tasksFile, JSON.stringify(active, null, 2), 'utf-8');
    }

    function findTaskById(id) { return tasks.find(t => t.id === id); }

    function findTaskByNumber(number) { return tasks.find(t => t.number === number); }

    message.dispatchers.taskManager = (payload) => {
        if (!payload || payload.number == null) return;
        // 只处理下载阶段消息，忽略 login / fetch_info_html 等内阶段
        if (payload.phase !== PHASE.FETCH_COMIC) return;

        const task = findTaskByNumber(Number(payload.number));
        if (!task) return;

        task.payload = payload;
        if (payload.step != null) task.step = payload.step;
        if (payload.stepState != null) task.stepState = payload.stepState;

        const stepStatus = stepStatusLabel(task.step, task.stepState, stepLabels, payload);

        const st = payload.state;
        if (st === STATE.START) {
            broadcast({
                type: 'started',
                id: task.id,
                task: { status: 'downloading', step: task.step, stepState: task.stepState, stepStatus, name: task.name },
            });
        } else if (st === STATE.RUNNING) {
            task.status = 'downloading';
            if (payload.step === 'download') {
                const complete = Number(payload.complete) || 0;
                const total = Number(payload.total) || 0;
                if (total > 0) {
                    task.progress = Math.min(1, complete / total);
                    task.downloadedSize = complete;
                    task.totalSize = total;
                    _updateSpeed(task, complete);
                }
            }
            broadcast({
                type: 'progress',
                id: task.id,
                task: {
                    progress: task.progress,
                    downloadedSize: task.downloadedSize,
                    totalSize: task.totalSize,
                    speed: task.speed,
                    status: 'downloading',
                    step: task.step,
                    stepState: task.stepState,
                    stepStatus,
                    name: task.name,
                },
            });
            updateTaskbarProgress();
        }
    };

    let runningCount = 0;
    const MAX_CONCURRENT = 5;
    const _lastProgress = {};
    const abortControllers = new Map();

    function updateTaskbarProgress() {
      const downloading = tasks.filter(t => t.status === 'downloading');
      if (downloading.length === 0) { setProgress(-1); return; }
      const withProgress = downloading.filter(t => t.progress > 0 && t.totalSize > 0);
      if (withProgress.length > 0) {
        const avg = withProgress.reduce((s, t) => s + t.progress, 0) / withProgress.length;
        setProgress(Math.min(1, avg));
      } else { setIndeterminate(); }
    }

    function _updateSpeed(task, complete) {
        const elapsed = Date.now() - task.addedDate;
        const avgSpeed = elapsed > 0 ? Math.round(complete / (elapsed / 1000)) : 0;
        task.speed = task.speed > 0 ? Math.round((avgSpeed + task.speed) / 2) : avgSpeed;
    }

    async function addTask(number, labels, opts = {}) {
        number = Number(number);
        const existing = findTaskByNumber(number);
        if (existing) {
            if (existing.status !== 'removed') return { ok: false, message: '该漫画已在任务列表中' };
            tasks = tasks.filter(t => t.number !== number);
        }

        const task = {
            id: number,
            number,
            name: opts.displayTitle || `#${number}`,
            url: '',
            status: 'waiting',
            progress: 0,
            speed: 0,
            downloadedSize: 0,
            totalSize: 0,
            labels: labels || [],
            error: null,
            step: null,
            stepState: null,
            coverBase64: opts.coverBase64 || null,
            displayTitle: opts.displayTitle || null,
            episodeNumber: opts.episodeNumber || null,
            withMeta: opts.withMeta !== false,
            addedDate: Date.now(),
            completedDate: null,
            payload: null,
            _afterSteps: opts.afterSteps || null,
        };

        tasks.push(task);
        saveTasks();
        broadcast({ type: 'added', task: { ...task, stepStatus: stepStatusLabel(task.step, task.stepState, stepLabels, task.payload) } });
        processQueue();
        return { ok: true, id: task.id, task };
    }

    function processQueue() {
        while (runningCount < MAX_CONCURRENT) {
            const task = tasks.find(t => t.status === 'waiting');
            if (!task) break;
            runningCount++;
            runTask(task);
        }
    }

    async function runTask(task) {
        const ac = new AbortController();
        abortControllers.set(task.id, ac);
        const signal = ac.signal;

        task.status = 'downloading';
        saveTasks();
        broadcast({ type: 'started', id: task.id, task: { status: 'downloading', stepStatus: stepStatusLabel(task.step, task.stepState, stepLabels, task.payload) } });
        updateTaskbarProgress();

        // 有 withMeta 时用元信息补充标签，无 displayTitle 时再补 name / cover
        if (task.withMeta) {
            try {
                const meta = await crawler.comic.getMeta(task.number);
                if (meta && meta.name) {
                    const fields = {};
                    if (!task.displayTitle) {
                        fields.name = `JM${task.number}: ${meta.name}`;
                    }
                    // 把 name 和 tags 追加到标签
                    fields.labels = [meta.name, ...(meta.tags || [])];
                    if (!task.coverBase64) {
                        try {
                            let cdnHost = config.cdnHosts[Math.floor(Math.random() * config.cdnHosts.length)];
                            meta.cover = meta.cover || `${cdnHost}/media/albums/${task.id}.jpg`;
                            const resp = await crawler.httpClient.get(meta.cover || re, { responseType: 'arraybuffer', timeout: 5000 });
                            if (resp && resp.data) {
                                const buf = Buffer.from(resp.data);
                                const mime = resp.headers['content-type'] || 'image/jpeg';
                                fields.coverBase64 = `data:${mime};base64,${buf.toString('base64')}`;
                            }
                        } catch (_) {}
                    }
                    updateTask(task.id, fields);
                }
            } catch (_) {}
        }

        try {
            await startDownload(task, task._afterSteps, signal);
        } finally {
            abortControllers.delete(task.id);
        }
        runningCount--;
        processQueue();
    }

    function updateTask(id, fields) {
        const task = findTaskById(id);
        if (!task) return { ok: false, message: '任务不存在' };
        const updated = {};
        for (const key of Object.keys(fields)) {
            if (key === 'id' || key === 'number' || key === '_afterSteps') continue;
            const val = fields[key];
            if (val !== undefined) {
                task[key] = val;
                updated[key] = val;
            }
        }
        saveTasks();
        if (Object.keys(updated).length > 0) {
            broadcast({ type: 'progress', id: task.id, task: { ...updated, stepStatus: stepStatusLabel(task.step, task.stepState, stepLabels, task.payload) } });
        }
        return { ok: true };
    }

    async function startDownload(task, afterSteps = null, signal = null) {
        try {
            const result = await crawler.comic.downloadArchive(task.number, true, null, signal);
            if (result?.file) {
                // 注入元信息步骤（仅当 withMeta 为 true 且有 afterSteps）
                if (task.withMeta && afterSteps) {
                    task.step = STEP.APPEND_COMIC_INFO;
                    task.stepState = STATE.RUNNING;
                    broadcast({ type: 'progress', id: task.id, task: { step: task.step, stepState: task.stepState, stepStatus: stepStatusLabel(task.step, task.stepState, stepLabels, task.payload) } });
                    try {
                        await afterSteps(result);
                        task.stepState = STATE.SUCCESS;
                    } catch (_) {
                        task.stepState = STATE.ERROR;
                    }
                    broadcast({ type: 'progress', id: task.id, task: { step: task.step, stepState: task.stepState, stepStatus: stepStatusLabel(task.step, task.stepState, stepLabels, task.payload) } });
                } else if (afterSteps) {
                    await afterSteps(result);
                }
            }
            task.status = 'completed';
            task.progress = 1;
            task.completedDate = Date.now();
            if (result) {
                task.downloadedSize = Number(result.complete) || task.totalSize || 0;
                task.totalSize = Number(result.total) || task.totalSize || 0;
            }
            saveTasks();
            broadcast({ type: 'completed', id: task.id });
            updateTaskbarProgress();
            let appIcon =  (manifest.icon && 'Microsoft.Windows.Shell.RunDialog' === manifest.appId) ? saveB64Image(manifest.icon, 'icon.ico') : null;
            let comicIcon = task.coverBase64 ? saveB64Image(task.coverBase64, task.id + '.png') : null;
            if (config.toast) {
                await toast({
                    appID: manifest.appId,
                    title: '\u2705 \u4E0B\u8F7D\u5B8C\u6210',
                    message: task.name || `JM${task.number}`,
                    icon: appIcon,
                    headerImg: comicIcon,
                });
            }
        } catch (e) {
            if (task.status === 'paused' || task.status === 'removed') return;
            task.status = 'error';
            task.error = e.message || String(e);
            saveTasks();
            broadcast({ type: 'error', id: task.id, error: task.error });
            updateTaskbarProgress();
        }
    }

    function removeTask(id, deleteFiles) {
        const idx = tasks.findIndex(t => t.id === id);
        if (idx === -1) return;
        const ac = abortControllers.get(id);
        if (ac) {
            ac.abort();
            abortControllers.delete(id);
        }
        const task = tasks[idx];
        task.status = 'removed';
        if (deleteFiles) {
            const comicDir = path.join(dataDir, 'comic');
            const zipPath = path.join(comicDir, `${task.number}.zip`);
            try { if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath); } catch (_) {}
        }
        saveTasks();
        broadcast({ type: 'removed', id });
        updateTaskbarProgress();
    }

    function startTask(id) {
        const task = findTaskById(id);
        if (!task || (task.status !== 'paused' && task.status !== 'error')) return;
        task.status = 'waiting';
        task.error = null;
        task.progress = 0;
        task.speed = 0;
        task.downloadedSize = 0;
        task.totalSize = 0;
        task.step = null;
        task.stepState = null;
        task.payload = null;
        task.addedDate = Date.now();
        saveTasks();
        broadcast({ type: 'started', id, task: { status: 'waiting', error: null, progress: 0, speed: 0, downloadedSize: 0, totalSize: 0 } });
        processQueue();
    }

    function pauseTask(id) {
        const task = findTaskById(id);
        if (!task || task.status !== 'downloading') return;
        task.status = 'paused';
        const ac = abortControllers.get(id);
        if (ac) {
            ac.abort();
            abortControllers.delete(id);
        }
        saveTasks();
        broadcast({ type: 'paused', id });
        updateTaskbarProgress();
    }

    function markTaskError(number, message) {
        const task = tasks.find(t => t.number === number && t.status !== 'removed');
        if (!task) return false;
        task.status = 'error';
        task.error = message;
        saveTasks();
        broadcast({ type: 'error', id: task.id, error: message });
        updateTaskbarProgress();
        return true;
    }

    function getTaskByNumber(number) {
        return tasks.find(t => t.number === Number(number)) || null;
    }

    /** 将任务状态转为详情页所需的 zip download 格式（向后兼容） */
    function getZipDownloadStatus(number) {
        const task = getTaskByNumber(number);
        if (!task) return null;
        const result = { step: task.step, stepState: task.stepState };
        switch (task.status) {
            case 'waiting':
                return { ...result, status: 'waiting', complete: 0, total: 0 };
            case 'downloading': {
                const c = Number(task.downloadedSize) || 0;
                const t = Number(task.totalSize) || 0;
                return { ...result, status: 'running', complete: c, total: t };
            }
            case 'completed':
                return { ...result, status: 'done', complete: Number(task.totalSize) || 0, total: Number(task.totalSize) || 0 };
            case 'error':
                return { ...result, status: 'error', error: String(task.error || '下载失败') };
            case 'paused':
                return { ...result, status: 'waiting', complete: 0, total: 0 };
            default:
                return null;
        }
    }

    function getTasks() {
        return tasks.filter(t => t.status !== 'removed')
            .map(t => ({ ...t, stepStatus: stepStatusLabel(t.step, t.stepState, stepLabels, t.payload) }))
            .sort((t1, t2) => {
                return (t2.completedDate || t2.addedDate) - (t1.completedDate || t1.addedDate);
            })
    }

    function getStatuses() {
        return STATUSES;
    }

    function handleWSMessage(msg) {
        if (!msg || !msg.type) return;

        switch (msg.type) {
            case 'add':
                return addTask(msg.number, msg.labels, msg);
            case 'remove':
                return removeTask(msg.id, msg.deleteFiles);
            case 'start':
                return startTask(msg.id);
            case 'pause':
                return pauseTask(msg.id);
            case 'list':
                broadcast({ type: 'init', tasks: getTasks(), statuses: STATUSES });
                return;
            case 'statuses':
                broadcast({ type: 'statuses', statuses: STATUSES });
                return;
        }
    }

    loadTasks();

    return {
        addTask,
        removeTask,
        startTask,
        pauseTask,
        markTaskError,
        updateTask,
        getTasks,
        getStatuses,
        getTaskByNumber,
        getZipDownloadStatus,
        handleWSMessage,
        setServer,
    };
}

module.exports = { createTaskManager };
