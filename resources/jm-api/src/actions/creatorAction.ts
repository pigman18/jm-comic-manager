import { createAsyncThunk } from "@reduxjs/toolkit";
import { GET_CREATOR_AUTHOR_LIST, GET_CREATOR_WORK_LIST, GET_CREATOR_AUTHOR_WORK_LIST, GET_CREATOR_WORK_INFO, GET_CREATOR_WORK_INFO_DETAIL, LOAD_CREATOR_LIST } from "../reducers/creatorReducer";
import HttpUtil from "../api/HttpUtil";
import { getApiEndpoint } from "../api/ApiEndpointUtil";

export const FETCH_CREATOR_AUTHOR_THUNK = createAsyncThunk(
    "creator_author/fetch",
    async (params: { page: number, search_query: string; }, { dispatch, rejectWithValue }) => {
        try {
            const url = getApiEndpoint("API_CREATOR_AUTHOR");

            await HttpUtil.fetchGet(url, params,
                (response: any) => {
                    if (response.code === 200) {
                        dispatch(GET_CREATOR_AUTHOR_LIST(response.data.data));
                    }
                    if (response.code === 401) {
                        dispatch(GET_CREATOR_AUTHOR_LIST({ content: [], total: 0, filters: {} }));
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

export const FETCH_CREATOR_WORK_THUNK = createAsyncThunk(
    "creator_work/fetch",
    async (params: { page: number, search_value: string; lang: string; source: string; }, { dispatch, rejectWithValue }) => {
        try {
            const url = getApiEndpoint("API_CREATOR_WORK");

            await HttpUtil.fetchGet(url, params,
                (response: any) => {
                    if (response.code === 200 && response.data.status === 200) {
                        dispatch(GET_CREATOR_WORK_LIST(response.data.data));
                    } else {
                        dispatch(GET_CREATOR_WORK_LIST({ content: [], total: "0", filters: {} }));
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


export const FETCH_CREATOR_AUTHOR_WORK_THUNK = createAsyncThunk(
    "creator_author_work/fetch",
    async (params: { id: string; lang: string; source: string; }, { dispatch, rejectWithValue }) => {
        try {
            const url = getApiEndpoint("API_CREATOR_WORK_DETAIL");

            await HttpUtil.fetchGet(url, params,
                (response: any) => {
                    if (response.code === 200) {
                        dispatch(GET_CREATOR_AUTHOR_WORK_LIST(response.data.data));
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

export const FETCH_CREATOR_WORK_INFO_THUNK = createAsyncThunk(
    "creator_work_info/fetch",
    async (id: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_CREATOR_WORK_INFO");

            await HttpUtil.fetchGet(url, { id },
                (response: any) => {
                    if (response.code === 200) {
                        res = response.data.data;
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


export const FETCH_CREATOR_WORK_INFO_DETAIL_THUNK = createAsyncThunk(
    "creator_work_info_detail",
    async (id: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_CREATOR_WORK_INFO_DETAIL");

            await HttpUtil.fetchGet(url, { id },
                (response: any) => {
                    if (response.code === 200) {
                        res = response.data;
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


