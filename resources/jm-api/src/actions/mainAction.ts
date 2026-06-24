import { createAsyncThunk } from "@reduxjs/toolkit";
import { GET_MAIN_LIST, GET_LATEST_LIST, GET_MORE_LIST, GET_ADS, GET_COVER_LIST } from "../reducers/mainReducer";
import HttpUtil from "../api/HttpUtil";
import { getApiEndpoint } from "../api/ApiEndpointUtil";
import apiPaths from "../api/apiPaths";
import GlobalStore from "../config/GlobalStore";

export const FETCH_MAIN_THUNK = createAsyncThunk(
    "main/fetch",
    async (_, { dispatch, rejectWithValue }) => {
        try {
            const url = getApiEndpoint("API_COMIC_PROMOTE");

            return HttpUtil.fetchGet(url,
                {}, (response: any) => {
                    if (response.code === 200) {
                        dispatch(GET_MAIN_LIST(response));
                    }
                },
                (error: any) => {
                    return new Error(error);
                },
            );
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

export const FETCH_LATEST_THUNK = createAsyncThunk(
    "latest/fetch",
    async (page: number, { dispatch, rejectWithValue }) => {
        try {
            const url = getApiEndpoint("API_COMIC_LATEST");

            return HttpUtil.fetchGet(url,
                { page }, (response: any) => {
                    if (response.code === 200) {
                        dispatch(GET_LATEST_LIST(response));
                    }
                },
                (error: any) => {
                    return new Error(error);
                }
            );
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

export const FETCH_MORE_THUNK = createAsyncThunk(
    "more/fetch",
    async (params: { id: string, page: number; }, { dispatch, rejectWithValue }) => {
        try {
            const url = getApiEndpoint("API_COMIC_PROMOTE_LIST");

            return HttpUtil.fetchGet(url,
                params, (response: any) => {
                    if (response.code === 200) {
                        dispatch(GET_MORE_LIST(response.data));
                    }
                },
                (error: any) => {
                    return new Error(error);
                }
            );
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

export const FETCH_SER_MORE_THUNK = createAsyncThunk(
    "serializationMore/fetch",
    async (params: { type?: string; date?: number; page?: number; }, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_COMIC_SER_MORE_LIST");

            await HttpUtil.fetchGet(url,
                params, (response: any) => {
                    if (response.code === 200) {
                        res = response;
                        dispatch(GET_MORE_LIST(response.data));
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

export const FETCH_COIN_BUY_THUNK = createAsyncThunk(
    "coinBuy/fetch",
    async (id: string, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_COIN_BUY_COMICS");

            await HttpUtil.fetchPost(url,
                { id }, (response: any) => {
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

export const FETCH_COVER_ADS_THUNK = createAsyncThunk(
    "coverAds/fetch",
    async (
        params: { lang?: string; ipcountry?: string; v?: number; } = {},
        { dispatch, rejectWithValue }
    ) => {
        const { lang = "TW", ipcountry = "TW", v = "" } = params;
        try {
            const baseUrl = getApiEndpoint("API_ADVERTISE_CONTENT_COVER");
            const url = `${baseUrl}?lang=${lang}&ipcountry=${ipcountry}&v=${v}`;

            const res: any = await new Promise((resolve) => {
                HttpUtil.fetchGet(url, {},
                    (response: any) => {
                        if (response.code === 200) {
                            resolve(response);
                            dispatch(GET_COVER_LIST(response.data));
                            localStorage.setItem("adsContent", JSON.stringify(response.data));
                        }
                    },
                    (error: any) => {
                        return new Error(error);
                    }
                );
            });
            return res.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || error || "獲取資料失敗");
        }
    }
);

export const FETCH_ALL_ADS_THUNK = createAsyncThunk(
    "allAdsContent/fetch",
    async (
        params: { adKey?: string; lang?: string; ipcountry?: string; v?: number; } = {},
        { dispatch, rejectWithValue }
    ) => {
        const { adKey = "", lang = "TW", ipcountry = "TW", v = "" } = params;
        try {
            const baseUrl = getApiEndpoint("API_ADVERTISE_ALL");
            const url = `${baseUrl}?lang=${lang}&ipcountry=${ipcountry}&v=${v}`;

            const res: any = await new Promise((resolve) => {
                HttpUtil.fetchGet(url, {},
                    (response: any) => {
                        if (response.code === 200) {
                            const ads = response.data?.[adKey];
                            if (ads) {
                                dispatch(GET_ADS(ads));
                            }
                            resolve(response);
                        }
                    },
                    (error: any) => {
                        return new Error(error);
                    }
                );
            });
            return res.data;
        } catch (error: any) {
            return rejectWithValue(error?.message || error || "獲取資料失敗");
        }
    }
);