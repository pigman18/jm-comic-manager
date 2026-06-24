import { createAsyncThunk } from "@reduxjs/toolkit";
import HttpUtil from "../api/HttpUtil";
import { getApiEndpoint } from "../api/ApiEndpointUtil";


export const FETCH_DETAIL_THUNK = createAsyncThunk(
    "detail/fetch",
    async (id: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_COMIC_DETAIL");

            await HttpUtil.fetchGet(url, { id },
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

export const FETCH_ALBUM_DOWNLOAD_THUNK = createAsyncThunk(
    "albumDownload/fetch",
    async (id: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const baseUrl = getApiEndpoint("API_ALBUM_DOWNLOAD");
            const url = `${baseUrl}/${id}`;

            await HttpUtil.fetchGet(url, {},
                (response: any) => {
                    if (response.code === 200) {
                        res = response;
                    } else {
                        return new Error("返回數據格式不正確");
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

export const FETCH_COMIC_READ_THUNK = createAsyncThunk(
    "comicRead/fetch",
    async (id: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_COMIC_READ");

            await HttpUtil.fetchGet(url, { id },
                (response: any) => {
                    if (response.code === 200) {
                        res = response.data;
                    } else {
                        return new Error("返回數據格式不正確");
                    }
                },
                (error: any) => {
                    return new Error(error);
                }
            );
            return res;

        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

