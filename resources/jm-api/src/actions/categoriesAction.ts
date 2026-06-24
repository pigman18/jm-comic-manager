import { createAsyncThunk } from "@reduxjs/toolkit";
import { GET_CATEGORIES_FILTER_LIST } from "../reducers/categoriesReducer";
import HttpUtil from "../api/HttpUtil";
import { getApiEndpoint } from "../api/ApiEndpointUtil";

export const FETCH_CATEGORIES_LIST_THUNK = createAsyncThunk(
    "categoriesList/fetch",
    async (_, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_CATEGORIES_LIST");

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

export const FETCH_CATEGORIES_FILTER_LIST_THUNK = createAsyncThunk(
    "categoriesFilterList/fetch",
    async (params: { page: number, o: string; c: string; }, { dispatch, rejectWithValue }) => {
        try {
            const url = getApiEndpoint("API_CATEGORIES_FILTER_LIST");

            await HttpUtil.fetchGet(url, params,
                (response: any) => {
                    if (response.code === 200) {
                        dispatch(GET_CATEGORIES_FILTER_LIST(response.data));
                    } else {
                        return new Error("返回數據格式不正確");
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