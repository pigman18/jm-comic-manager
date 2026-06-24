import { createAsyncThunk } from "@reduxjs/toolkit";
import { GET_SEARCH_LIST } from "../reducers/searchReducer";
import HttpUtil from "../api/HttpUtil";
import { getApiEndpoint } from "../api/ApiEndpointUtil";
import { GET_NOVEL_FAVORITES_LIST, GET_NOVEL_LIST, GET_NOVEL_SEARCH_LIST } from "../reducers/novelReducer";

// 小說列表頁 /novels

// 小說介紹頁（最新一話Jcoin購買）/novel?nid=小說id

// 小說閱讀頁 /novelchapters?ncid=章節id

// 搜尋 小說內容 /search_novels?search_query=urlencode(搜索字)

// 小說收藏 /novel_favorites POST nid=小說id

// 小說喜歡 /like POST like_type=novel&id=小說id

// 小說評論 /comment POST nid=小說id&ncid=章節id(可空)

// 會員小說收藏列表(含小說資料夾列表) /novel_favorites?page=1&folder_id=資料夾id(可空)


export const FETCH_NOVEL_LIST_THUNK = createAsyncThunk(
    "novel/fetch",
    async (params: { o?: string; t?: string; nid?: string; }, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOVEL_LIST");

            await HttpUtil.fetchGet(url, params,

                (response: any) => {
                    if (response.code === 200) {
                        res = response.data;
                        dispatch(GET_NOVEL_LIST(response.data));
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

export const FETCH_NOVEL_DETAIL_THUNK = createAsyncThunk(
    "novelDetail/fetch",
    async (params: { o?: string; t?: string; nid?: string; }, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOVEL_DETAIL");

            await HttpUtil.fetchGet(url, params,

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

export const FETCH_NOVEL_CHAPTERS_THUNK = createAsyncThunk(
    "novelChapters/fetch",
    async (params: { ncid: string; lang: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOVEL_CHAPTERS");

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

export const FETCH_NOVEL_SEARCH_THUNK = createAsyncThunk(
    "novelSearch/fetch",
    async (params: { search_query: string; }, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOVEL_SEARCH");

            await HttpUtil.fetchGet(url, params,
                (response: any) => {
                    if (response.code === 200) {
                        res = response;
                        dispatch(GET_NOVEL_SEARCH_LIST(response.data));
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

export const FETCH_ADD_NOVEL_LIKE_THUNK = createAsyncThunk(
    "novelAddLike/fetch",
    async (params: { id: string; like_type?: "novel"; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOVEL_LIKE");

            await HttpUtil.fetchPost(url, params,
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

export const FETCH_ADD_NOVEL_COMMENT_THUNK = createAsyncThunk(
    "novelAddComment/fetch",
    async (params: { nid: string; comment: string; comment_id?: string; ncid?: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOVEL_COMMENT");

            await HttpUtil.fetchPost(url, params,
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

export const FETCH_ADD_NOVEL_FAVORITES_THUNK = createAsyncThunk(
    "novelAddFavorites/fetch",
    async (params: { nid: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOVEL_FAVORITES");

            await HttpUtil.fetchPost(url, params,
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



export const FETCH_NOVEL_FAVORITES_LIST_THUNK = createAsyncThunk(
    "novelFavoritesList/fetch",
    async (params: { page: number; folder_id: string; o: string; }, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOVEL_FAVORITES");

            await HttpUtil.fetchGet(url, params,
                (response: any) => {
                    if (response.code === 200) {
                        res = response;
                        dispatch(GET_NOVEL_FAVORITES_LIST(response.data));
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

export const FETCH_EDIT_NOVEL_FAVORITES_THUNK = createAsyncThunk(
    "editNovelFavoritesList/fetch",
    async (params: { type: string; folder_name: string; folder_id: string; nid: string; }, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_EDIT_NOVEL_FAVORITES");

            await HttpUtil.fetchPost(url, params,
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

export const FETCH_NOVEL_COIN_BUY_THUNK = createAsyncThunk(
    "novelCoinBuy/fetch",
    async (params: { id: string; }, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOVEL_COIN_BUY");

            await HttpUtil.fetchPost(url, params,
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