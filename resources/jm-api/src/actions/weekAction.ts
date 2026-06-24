import { createAsyncThunk } from "@reduxjs/toolkit";
import HttpUtil from "../api/HttpUtil";
import { getApiEndpoint } from "../api/ApiEndpointUtil";


export const FETCH_WEEK_THUNK = createAsyncThunk(
    "week/fetch",
    async (_, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_WEEK");

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

export const FETCH_WEEK_FILTER_THUNK = createAsyncThunk(
    "weekFilter/fetch",
    async (params: { id: string; type: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_WEEK__FILTER_LIST");

            await HttpUtil.fetchGet(url, params,
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