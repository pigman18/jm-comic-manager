import { createAsyncThunk } from "@reduxjs/toolkit";
import HttpUtil from "../api/HttpUtil";
import { decryptData } from "../utils/Function";
import { getApiEndpoint } from "../api/ApiEndpointUtil";

export const FETCH_GET_SETTINGS_THUNK = createAsyncThunk(
  "getSettings/fetch",
  async (params: { app_img_shunt: string, express?: string; }, { dispatch, rejectWithValue }) => {
    try {
      const { app_img_shunt, express } = params;

      const url = getApiEndpoint("API_APP_SETTING");

      let res: Record<string, any> = {};
      await HttpUtil.fetchGet(url, { app_img_shunt, express, t: Math.floor(Date.now() / 1000) },
        (response: any) => {
          if (response.code === 200) {
            res = response;
            localStorage.setItem("main_web_host", response.data.main_web_host);
          }
        },
        (error: any) => {
          return new Error(error);
        }
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
    }
  }
);

export const FETCH_SETTINGS_THUNK = createAsyncThunk(
  "settings/fetch",
  async (language: string, { rejectWithValue }) => {
    try {
      let res: Record<string, any> = {};

      const url = getApiEndpoint("API_APP_SETTING");

      await HttpUtil.fetchPost(url, { language, t: Math.floor(Date.now() / 1000) },
        (response: any) => {
          if (response.code === 200) {
            res = response;
          }
        },
        (error: any) => {
          return new Error(error);
        }
      );
      return res.data;
    } catch (error) {
      return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
    }
  }
);

//線路
export const FETCH_HOST_THUNK = createAsyncThunk(
  'host/loadHostData',
  async (_, { rejectWithValue }) => {
    const url = process.env.REACT_APP_HOST;
    const url_back_up = process.env.REACT_APP_HOST_BACKUP;

    const urls = [url, url_back_up].filter(Boolean); // 過濾掉 undefined

    if (urls.length === 0) {
      return rejectWithValue("無效的 URL，請檢查 REACT_APP_HOST 和 REACT_APP_HOST_BACKUP 是否正確配置");
    }
    try {
      let response: Response | undefined;

      for (const u of urls) {
        try {
          response = await fetch(u!);
          if (response.ok) break;
          console.warn(`請求 ${u} 失敗，嘗試下一個 URL...`);
        } catch (err) {
          console.warn(`嘗試 ${u} 時出錯：`, err);
        }
      }
      if (!response || !response.ok) {
        return rejectWithValue("所有 URL 請求均失敗");
      }
      const text = await response.text();
      return decryptData(text);
    } catch (error) {
      return rejectWithValue("載入資料失敗：" + (error as Error).message);
    }
  }
);
