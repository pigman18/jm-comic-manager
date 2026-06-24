
import CryptoJS from "crypto-js";
import md5 from "md5";
import { showErrorModal } from "../utils/showErrorModal";
import { getTaipeiTimeString } from "../utils/Function";
import apiPaths from "./apiPaths";
import GlobalStore from "../config/GlobalStore";

const maxRetries = 3;
let getRetryCount = 0;
let postRetryCount = 0;

const version = process.env.REACT_APP_VERSION;
let d1 = new Date();
let gmtTime = new Date(d1.toUTCString());
let time = Math.floor(gmtTime.getTime() / 1000);
let tokenParam = time + "," + version;
let token = md5(String(time) + apiPaths.token);

export const tryDecryption = async (response: any, successCallback: (responseObj: any) => void, url: string) => {
    const responseObj = await response.json();
    const possibleKeys = [
        [49, 56, 53, 72, 99, 111, 109, 105, 99, 51, 80, 65, 80, 80, 55, 82],
        [49, 56, 99, 111, 109, 105, 99, 65, 80, 80, 67, 111, 110, 116, 101, 110, 116],
    ];
    let decryptionSuccessful = false;
    for (const key of possibleKeys) {
        const content = String.fromCharCode.apply(null, key);
        const adKey = ["ad_content_all", "advertise_all"];
        const searchTerm = adKey.some(term => url.includes(term));
        const keyToTry = searchTerm ? md5(content) : md5(time + content);
        const keyObj = CryptoJS.enc.Utf8.parse(keyToTry);
        try {
            const decrypt = CryptoJS.AES.decrypt(responseObj.data, keyObj, {
                mode: CryptoJS.mode.ECB,
            });
            const decryptedData = decrypt.toString(CryptoJS.enc.Utf8);

            try {
                responseObj.data = JSON.parse(decryptedData);
                decryptionSuccessful = true;
                break;
            } catch (e) { }
        } catch (e) { }
    }
    if (!decryptionSuccessful) {
        responseObj.data = "";
    }
    successCallback(responseObj);
};

const parseUrl = (inputUrl: string) => {
    const urlObj = new URL(inputUrl);
    const path = urlObj.pathname;
    const lastSegment = path.split('/').filter(Boolean).pop() || "";

    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
    });
    return lastSegment;
};

const getApiHostInfo = () => {
    const apiHost = new URL(GlobalStore.apiUrl).host;
    const match = GlobalStore.hostServer.find(([host, label]: [string, string]) => host === apiHost);
    return {
        hostName: match?.[1] ?? null,
    };
};

const fetchWithTimeout = (url: string, method: string, fetchPromise: Promise<Response>): Promise<Response> => {
    const TIMEOUT = 15000;
    const defaultErrorMsg = `${method} 發生錯誤(timeout)，請回報管理員 \n\n現在時間：${getTaipeiTimeString()} ,\nsource=${getApiHostInfo()?.hostName}\nkey=${parseUrl(url)}\n\n＊目前版本為 ${version} 版，最新版本為 ${version} 版\n\n若仍有問題請截圖到官方Discord群\nhttps://discord.gg/V74p7HM\n#網站與app問題回報\n\n`;
    return Promise.race([
        fetchPromise,
        new Promise<Response>((_, reject) =>
            setTimeout(() => reject(new Error(defaultErrorMsg)), TIMEOUT)
        ),
    ]);
};

const HttpUtil = {
    fetchGet: async (
        url: string,
        params: Record<string, any> = {},
        successCallback: (responseObj: any) => void,
        failCallback: (error: any) => void,
    ): Promise<any> => {
        if (params) {
            const paramsBody = Object.keys(params)
                .reduce((a: string[], k: string) => {
                    a.push(k + "=" + encodeURIComponent(params[k]));
                    return a;
                }, [])
                .join("&");

            if (paramsBody) {
                url += "?" + paramsBody;
            }
        }
        try {
            const jwttoken = JSON.parse(localStorage.getItem("jwttoken") as string) || "";
            const memberInfo = JSON.parse(localStorage.getItem("memberInfo") as string) || "";

            const response = await fetchWithTimeout(
                url,
                "GET",
                fetch(url, {
                    credentials: "include",
                    referrerPolicy: "no-referrer",
                    headers: {
                        "Tokenparam": tokenParam,
                        "Token": token,
                        "Authorization": jwttoken ? `Bearer ${jwttoken}` : "",
                        "Cookie": memberInfo ? `AVS=${memberInfo?.s}` : "",
                    },
                }),
            );

            if (!response.ok && response.status !== 401) {
                const defaultErrorMsg = `Get 發生錯誤，請回報管理員 \n\n現在時間：${getTaipeiTimeString()} ,\nsource=${getApiHostInfo()?.hostName}\nkey=${parseUrl(url)}\n\n＊目前版本為 ${version} 版，最新版本為 ${version} 版\n\n若仍有問題請截圖到官方Discord群\nhttps://discord.gg/V74p7HM\n#網站與app問題回報\n\n`;

                if (getRetryCount < maxRetries) {
                    getRetryCount++;
                    failCallback(`${response.status}\n${defaultErrorMsg}`);
                    HttpUtil.fetchGet(url, {}, successCallback, failCallback);
                    return;
                } else {
                    failCallback(`達到最大重試次數\n${defaultErrorMsg}`);
                    showErrorModal(url, `${response.status}\n${defaultErrorMsg}`);
                }
            }

            await tryDecryption(response, successCallback, url);

        } catch (error: any) {
            failCallback(error);
            const errorMessage = error?.message || error;
            if (errorMessage.includes("timeout")) {
                showErrorModal(url, `錯誤：${errorMessage}`);
            }
            throw new Error(errorMessage);
        }

    },
    fetchPost: async (
        url: string,
        params: Record<string, any> = {},
        successCallback: (responseObj: any) => void,
        failCallback: (error: any) => void,
    ): Promise<any> => {

        const formData = new FormData();

        if (Object.keys(params).length > 0) {
            Object.entries(params).forEach(([key, value]) => {
                formData.append(key, value);
            });
        }
        try {
            const jwttoken = JSON.parse(localStorage.getItem("jwttoken") as string) || "";
            const memberInfo = JSON.parse(localStorage.getItem("memberInfo") as string) || "";

            const response = await fetchWithTimeout(
                url,
                "POST",
                fetch(url, {
                    method: "POST",
                    credentials: "include",
                    referrerPolicy: "no-referrer",
                    headers: {
                        "Tokenparam": tokenParam,
                        "Token": token,
                        "Authorization": jwttoken ? `Bearer ${jwttoken}` : "",
                        "Cookie": memberInfo ? `AVS=${memberInfo?.s}` : "",
                    },
                    body: formData,
                }),
            );

            if (!response.ok && response.status !== 401) {
                const defaultErrorMsg = `POST 發生錯誤，請回報管理員 \n\n現在時間：${getTaipeiTimeString()} ,\nsource=${getApiHostInfo()?.hostName}\nkey=${parseUrl(url)}\n\n＊目前版本為 ${version}版，最新版本為 ${version}版\n\n若仍有問題請截圖到官方Discord群\nhttps://discord.gg/V74p7HM\n#網站與app問題回報\n\n`;

                if (postRetryCount < maxRetries) {
                    postRetryCount++;
                    failCallback(`${response.status}\n${defaultErrorMsg}`);
                    HttpUtil.fetchPost(url, {}, successCallback, failCallback);
                    return;
                } else {
                    failCallback(`達到最大重試次數\n${defaultErrorMsg}`);
                    showErrorModal(url, `${response.status}\n${defaultErrorMsg}`);
                }
            }

            await tryDecryption(response, successCallback, url);

        } catch (error: any) {
            failCallback(error);
            const errorMessage = error?.message || error;
            if (errorMessage.includes("timeout")) {
                showErrorModal(url, errorMessage);
            }
            throw new Error(errorMessage);
        }
    },
};

export default HttpUtil;






