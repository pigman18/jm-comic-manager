import * as vscode from "vscode";
import { dispatchOnMessage, LABEL_TO_ID, ChannelId } from './progress';

export function registerMessageDispatcher(context: vscode.ExtensionContext, jmBundle: any) {
    if (!jmBundle?.message) return;

    jmBundle.state.message.dispatchers.vscode = async (payload: any) => {
        const cfg = vscode.workspace.getConfiguration('jm');
        const labels = cfg.get<string[]>('notificationChannels', []);
        const enabled: ChannelId[] = [];
        for (const label of labels) {
            const id = LABEL_TO_ID[label];
            if (id) enabled.push(id);
        }
        dispatchOnMessage(payload, enabled);
    };
}
