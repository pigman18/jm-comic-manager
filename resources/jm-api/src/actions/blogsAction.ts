import { createAsyncThunk } from "@reduxjs/toolkit";
import { GET_BLOGS_LIST } from "../reducers/blogsReducer";
import HttpUtil from "../api/HttpUtil";
import { getApiEndpoint } from "../api/ApiEndpointUtil";

export const FETCH_BLOGS_LIST_THUNK = createAsyncThunk(
    "blogsList/fetch",
    async (params: { page: number, blog_type: string; }, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_BLOGS_LIST");

            await HttpUtil.fetchGet(url, params,
                (response: any) => {
                    if (response.code === 200) {
                        res = response;
                        dispatch(GET_BLOGS_LIST(response.data));
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

export const FETCH_BLOGS_INFO_THUNK = createAsyncThunk(
    "blogsInfo/fetch",
    async (id: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_BLOG_INFO");

            await HttpUtil.fetchGet(url, { id },
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

export const FETCH_GAME_INFO_THUNK = createAsyncThunk(
    "gameInfo/fetch",
    async (id: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const baseUrl = getApiEndpoint("API_GAME_INFO");
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