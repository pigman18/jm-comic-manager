import { createAsyncThunk } from "@reduxjs/toolkit";
import HttpUtil from "../api/HttpUtil";
import { SET_MOVIES_DETAIL } from "../reducers/moviesPlayerReducer";
import { getApiEndpoint } from "../api/ApiEndpointUtil";

export const FETCH_MOVIE_PLAYER_THUNK = createAsyncThunk(
    "video/fetchDetail",
    async (
        params: { id: string; video_type: string; },
        { dispatch, rejectWithValue }
    ) => {
        try {
            let response: any = {};

            const url = getApiEndpoint("API_VIDEO_INFO");

            await HttpUtil.fetchGet(
                url,
                params,
                (res: any) => {
                    if (res.code === 200) {
                        response = res;
                    } else {
                        throw new Error("API 回傳錯誤");
                    }
                },
                (error: any) => {
                    throw new Error(error);
                }
            );
            if (response.code === 200) {
                dispatch(SET_MOVIES_DETAIL(response.data));
            } else {
                return rejectWithValue("API 回傳錯誤");
            }
        } catch (error: any) {
            return rejectWithValue(error.message || "資料獲取失敗");
        }
    }
);
