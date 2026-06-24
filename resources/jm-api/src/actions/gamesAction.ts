import { createAsyncThunk } from "@reduxjs/toolkit";
import { RootState } from "../store";
import HttpUtil from "../api/HttpUtil";
import { GET_GAMES_LIST, APPEND_GAMES_LIST } from "../reducers/gamesReducer";
import { getApiEndpoint } from "../api/ApiEndpointUtil";

export const FETCH_CATEGORIES_THUNK = createAsyncThunk(
    "games/fetchCategories",
    async (_,
        { rejectWithValue }
    ) => {
        try {
            const url = getApiEndpoint("API_GAMES_LIST");

            const response = await new Promise((resolve, reject) => {
                HttpUtil.fetchGet(url, {}, (res) => {
                    if (res.code === 200) {
                        resolve(res.data.categories); // 只取分類
                    } else {
                        reject("分類載入失敗");
                    }
                }, reject);
            });
            return response;
        } catch (error: any) {
            return rejectWithValue(error?.message || error || "獲取分類失敗");
        }
    }
);


export const FETCH_GAMES_LIST_THUNK = createAsyncThunk(
    "games/fetchList",
    async (
        params: {
            page: number;
            append?: boolean;
            search_query?: string;
            category?: string;
            sub_category?: string;
        },
        { dispatch, getState, rejectWithValue }
    ) => {
        try {
            const url = getApiEndpoint("API_GAMES_LIST");

            const query: Record<string, any> = {
                page: params.page,
            };
            if (params.search_query) query.search = params.search_query;
            if (params.category) query.category = params.category;
            if (params.sub_category) query.game_type = params.sub_category;

            await HttpUtil.fetchGet(url, query,
                (res: any) => {
                    if (res.code === 200) {
                        const data = res.data;
                        const payload = {
                            games: data.games,
                            hotGames: data.hot_games,
                            categories: data.categories,
                            games_total: data.games_total,
                        };

                        if (params.append) {
                            const state = getState() as RootState;
                            const existingIds = new Set(state.games.games.map((g) => g.gid));
                            const filteredGames = data.games.filter((g: any) => !existingIds.has(g.gid));
                            dispatch(
                                APPEND_GAMES_LIST({
                                    games: filteredGames,
                                    games_total: payload.games_total,
                                    categories: payload.categories,
                                })
                            );
                        } else {
                            dispatch(GET_GAMES_LIST(payload));
                        }
                    } else {
                        console.warn("API 回傳錯誤格式", res);
                        rejectWithValue("資料格式錯誤");
                    }
                },
                (error: any) => {
                    console.error("API 請求失敗", error);
                    rejectWithValue(error);
                }
            );
        } catch (error: any) {
            console.error("fetchGet 錯誤捕捉", error);
            return rejectWithValue(error.message || "資料獲取失敗");
        }
    }
);


export const FETCH_BANNERS_THUNK = createAsyncThunk(
    "games/fetchBanners",
    async (setting: Record<string, any>, { dispatch, getState, rejectWithValue }) => {
        if (setting?.ad_cache_version) {
            try {
                const url = getApiEndpoint("API_ADVERTISE");

                const v = setting.ad_cache_version.toString();
                let res: Record<string, any> = {};

                await HttpUtil.fetchGet(url,
                    { type: "img", group: "game_banners", v },
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
