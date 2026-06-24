import { createAsyncThunk } from "@reduxjs/toolkit";
import { GET_SEARCH_LIST } from "../reducers/searchReducer";
import HttpUtil from "../api/HttpUtil";
import { getApiEndpoint } from "../api/ApiEndpointUtil";

export const FETCH_SEARCH_THUNK = createAsyncThunk(
    "search/fetch",
    async (params: { search_query: string, o?: string; page?: number; }, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_COMIC_SEARCH");

            await HttpUtil.fetchGet(url, params,

                (response: any) => {
                    if (response.code === 200) {
                        res = response.data;
                        dispatch(GET_SEARCH_LIST(response.data));
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

export const FETCH_HOT_TAGS_THUNK = createAsyncThunk(
    "hot_tags/fetch",
    async (_, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_COMIC_HOT_TAGS");

            await HttpUtil.fetchGet(url, {},
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

export const FETCH_RECOMMEND_THUNK = createAsyncThunk(
    "recommend/fetch",
    async (_, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_COMIC_RANDOM_RECOMMEND");

            await HttpUtil.fetchGet(url, {},
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
