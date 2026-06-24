import { createAsyncThunk } from "@reduxjs/toolkit";
import { getApiEndpoint } from "../api/ApiEndpointUtil";
import HttpUtil from "../api/HttpUtil";
import { GET_EXCLUSIVE_LIST, GET_MOVIES_LIST } from "../reducers/moviesReducer";


export const FETCH_MOVIES_LIST_THUNK = createAsyncThunk(
    "moviesList/fetch",
    async (
        params: {
            page: number;
            search_query?: string;
            video_type?: string;
        },
        { dispatch, rejectWithValue }
    ) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_VIDEOS_LIST");

            await HttpUtil.fetchGet(url,
                {
                    page: params.page,
                    search_query: params.search_query,
                    video_type: params.video_type,
                },
                (response: any) => {
                    if (response.code === 200) {
                        res = response;

                        if (params.video_type === "movie_exclude") {
                            dispatch(GET_EXCLUSIVE_LIST(res.data));
                        } else {
                            dispatch(GET_MOVIES_LIST(res.data));
                        }

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








export const FETCH_LATEST_HANIME_THUNK = createAsyncThunk(
    "latestHanime/fetch",
    async (_, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_LATEST_HANIME");

            await HttpUtil.fetchGet(url, {},
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
    });


export const FETCH_MOVIES_BANNERS_THUNK = createAsyncThunk(
    "games/fetchBanners",
    async (setting: Record<string, any>, { dispatch, getState, rejectWithValue }) => {
        if (setting?.ad_cache_version) {
            try {
                const v = setting.ad_cache_version.toString();
                let res: Record<string, any> = {};

                const url = getApiEndpoint("API_ADVERTISE");

                await HttpUtil.fetchGet(url,
                    { type: "img", group: "app_movies_top_banner", v },
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
                return res.data.adv;


            } catch (error) {
                return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
            }
        } else {
            return rejectWithValue("未找到廣告數據來源版本");
        }
    }
);


export const FETCH_BAITU_TOKEN_THUNK = createAsyncThunk(
    "baituToken/fetch",
    async (_, { dispatch, rejectWithValue }
    ) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_BAITU_CREATE_TOKEN");

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

            return res;

        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);
