import * as vscode from 'vscode';

/** 通道标识集合 */
export const CHANNEL_IDS = {
  WINDOW_PROGRESS: 'windowProgress',
  NOTIFICATION: 'notification',
  NOTIFICATION_PROGRESS: 'notificationProgress',
  STATUSBAR: 'statusbar',
  OUTPUT: 'output',
  TREE: 'tree',
  STEP_TIP: 'stepTip',
} as const;

export type ChannelId = (typeof CHANNEL_IDS)[keyof typeof CHANNEL_IDS];

export const ALL_CHANNEL_IDS: ChannelId[] = Object.values(CHANNEL_IDS);

export const CHANNEL_LABELS: Record<ChannelId, string> = {
  windowProgress: '窗口进度',
  notification: '通知弹窗',
  notificationProgress: '通知进度条',
  statusbar: '状态栏进度',
  output: '输出面板',
  tree: '视图树',
  stepTip: '状态栏步骤提示',
};

/** 中文标签 → ChannelId 映射（settings 中 enum 使用中文） */
export const LABEL_TO_ID: Record<string, ChannelId> = {
  '窗口进度': 'windowProgress',
  '通知弹窗': 'notification',
  '通知进度条': 'notificationProgress',
  '状态栏进度': 'statusbar',
  '输出面板': 'output',
  '视图树': 'tree',
  '状态栏步骤提示': 'stepTip',
};

/* ========= 持久化实例 ========= */

let sbItem: vscode.StatusBarItem | undefined;
let tipItem: vscode.StatusBarItem | undefined;
let outChannel: vscode.OutputChannel | undefined;
let setTreeRootDesc: ((text: string) => void) | undefined;

/* ========= 通知进度条（单例，轮询更新） ========= */

let notifData = { complete: 0, total: 0, step: '', prevPct: 0 };
let notifActive = false;

/** 工具：phase 中文名 */
function phaseLabel(phase: string): string {
  const map: Record<string, string> = {
    login: '登录',
    fetch_info_html: '获取漫画页',
    fetch_info: '获取漫画信息',
    fetch_comic: '下载漫画',
    fetch_file: '获取数据文件',
    fetch_comic_page: '获取漫画分页',
    sync_local_to_db: '本地同步到数据库',
    sync_db_to_local: '数据库同步到本地',
  };
  return map[phase] || phase;
}

/* ========= 窗口进度 ========= */

export function sendWindowProgress(complete: number, total: number, _step?: string) {
  vscode.window.withProgress(
    { location: vscode.ProgressLocation.Window, title: 'JM 漫画下载' },
    async (progress) => {
      progress.report({ message: `${complete}/${total}`, increment: (complete / total) * 100 });
      await new Promise(() => {});
    }
  );
}

/* ========= 通知弹窗 ========= */

export function sendNotification(phase: string, state: string, _step?: string, errorMsg?: string) {
  const label = phaseLabel(phase);
  if (state === 'start') {
    vscode.window.showInformationMessage(`🔄 ${label} 开始`);
  } else if (state === 'success') {
    vscode.window.showInformationMessage(`✅ ${label} 完成`);
  } else if (state === 'error') {
    vscode.window.showErrorMessage(`❌ ${label} 失败${errorMsg ? `：${errorMsg}` : ''}`);
  }
}

/* ========= 通知进度条（单例） ========= */

export function sendNotificationProgress(complete: number, total: number, _step?: string) {
  notifData.complete = complete;
  notifData.total = total;
  if (_step) notifData.step = _step;
  if (notifActive) return;
  notifActive = true;
  vscode.window.withProgress(
    { location: vscode.ProgressLocation.Notification, title: 'JM 漫画下载' },
    async (progress) => {
      while (notifData.complete < notifData.total) {
        await new Promise(r => setTimeout(r, 300));
        if (notifData.complete > 0 && notifData.total > 0) {
          progress.report({
            message: `${notifData.complete}/${notifData.total} ${notifData.step || ''}`,
            increment: Math.max(0, ((notifData.complete / notifData.total) * 100) - (notifData.prevPct || 0)),
          });
          notifData.prevPct = (notifData.complete / notifData.total) * 100;
        }
      }
      progress.report({ message: `${notifData.complete}/${notifData.total} 完成`, increment: 100 });
    }
  ).then(() => { notifActive = false; }, () => { notifActive = false; });
}

/* ========= 状态栏进度 ========= */

export function sendStatusbarProgress(complete: number, total: number, _step?: string) {
  if (!sbItem) {
    sbItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    sbItem.show();
  }
  sbItem.text = `$(cloud-download) ${complete}/${total}`;
  sbItem.tooltip = `JM 下载 ${Math.round((complete / total) * 100)}%`;
}

/* ========= 输出面板 ========= */

export function sendOutputProgress(complete: number, total: number, step?: string) {
  if (!outChannel) {
    outChannel = vscode.window.createOutputChannel('JM 漫画下载');
  }
  const parts = [`[${new Date().toLocaleTimeString()}]`];
  if (complete != null) parts.push(`${complete}/${total}`);
  if (step) parts.push(`(${step})`);
  outChannel.appendLine(parts.filter(Boolean).join(' '));
}

/* ========= 视图树 ========= */

export function sendTreeProgress(complete: number, total: number, _step?: string) {
  setTreeRootDesc?.(`${complete}/${total}`);
}

export function bindJmTreeProgress(setter: (text: string) => void) {
  setTreeRootDesc = setter;
}

/* ========= 状态栏步骤提示 ========= */

export function showStepTip(text: string) {
  if (!tipItem) {
    tipItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 99);
    tipItem.show();
  }
  tipItem.text = `$(symbol-event) ${text}`;
}

export function hideStepTip() {
  tipItem?.hide();
}

/* ========= 通道注册 & 统一分发 ========= */

type Payload = { phase: string; state: string; step?: string; complete?: number; total?: number; number?: number; text?: string; error?: any };

type Handler = (payload: Payload) => void;

const channelHandlers: Record<ChannelId, Handler> = {
  windowProgress(p) {
    if (p.complete != null && p.total != null && p.total > 0) sendWindowProgress(p.complete, p.total, p.step);
  },
  notification(p) {
    sendNotification(p.phase, p.state, p.step, p.error ? String(p.error) : undefined);
  },
  notificationProgress(p) {
    if (p.complete != null && p.total != null && p.total > 0) sendNotificationProgress(p.complete, p.total, p.step);
  },
  statusbar(p) {
    if (p.complete != null && p.total != null) sendStatusbarProgress(p.complete, p.total, p.step);
  },
  output(p) {
    sendOutputProgress(p.complete!, p.total!, p.step);
  },
  tree(p) {
    if (p.complete != null && p.total != null) sendTreeProgress(p.complete, p.total, p.step);
  },
  stepTip(p) {
    if (p.step) showStepTip(p.step);
  },
};

export function dispatchOnMessage(payload: Payload, enabled: ChannelId[]) {
  for (const id of enabled) {
    channelHandlers[id]?.(payload);
  }
}
