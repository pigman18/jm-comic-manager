import GlobalStore from "../config/GlobalStore";
import apiPaths from "./apiPaths";
import { decryptData, getRandomItems } from "../utils/Function";

export const getApiEndpoint = (key: keyof typeof apiPaths): string => {
    if (!GlobalStore.apiUrl) {
        throw new Error("API endpoints 尚未初始化");
    }

    return `${GlobalStore.apiUrl}${apiPaths[key]}`;
};

// 封裝設定 GlobalStore 主機的函式
export const setGlobalHostFromData = (data: { Server: any[]; jm3_Server: string; }) => {
    const { items } = getRandomItems(data.Server);
    const apiUrl = `https://${items}/`;
    GlobalStore.apiUrl = apiUrl;
    GlobalStore.hostServer = data.jm3_Server;

    return apiUrl;
};

export const FETCH_HOST = async () => {
    const urlPrimary = process.env.REACT_APP_HOST;
    const urlBackup = process.env.REACT_APP_HOST_BACKUP;
    const urlSecondaryBackup = process.env.REACT_APP_HOST_BACKUP_SECOND;
    const hostCode = process.env.REACT_APP_HOST_BACKUP_CODE;

    const urls = [urlPrimary].filter(Boolean) as string[];

    const tryFetchAndDecrypt = async (url: string): Promise<any | null> => {
        try {
            // console.log(`嘗試請求：${url}`);
            const response = await fetch(url);
            if (!response.ok) {
                console.warn(`請求失敗，狀態碼：${response.status}`);
                return null;
            }
            const text = await response.text();
            const data = await decryptData(text);
            localStorage.setItem("fetchHost", "txt");
            return data;
        } catch (err) {
            console.warn(`請求 ${url} 發生錯誤：`, err);
            return null;
        }
    };

    for (const url of urls) {
        const data = await tryFetchAndDecrypt(url);
        if (data) {
            const newUrl = setGlobalHostFromData(data);
            // console.log(`成功設定主機：${newUrl}`);
            return data;
        }
    }

    // 所有 URL 都失敗，使用 hostCode
    console.warn("所有 URL 請求均失敗，改用備援 hostCode...");

    try {
        const backupData = await decryptData(hostCode);
        const newUrl = setGlobalHostFromData(backupData);
        localStorage.setItem("fetchHost", "backup");
        // console.log(`使用備援主機：${newUrl}`);
        return backupData;
    } catch (err) {
        console.error("備援 hostCode 解密失敗：", err);
        throw new Error("無法取得任何有效主機資訊");
    }
};
