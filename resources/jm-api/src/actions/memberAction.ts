

import { createAsyncThunk } from "@reduxjs/toolkit";
import HttpUtil from "../api/HttpUtil";
import { GET_FAVORITE_LIST, GET_WATCH_LIST, GET_TRACKED_LIST, GET_NOTIFICATION_LIST, GET_TASK_LIST } from "../reducers/memberReducer";
import { saveAuthData } from "../Hooks/useAuth";
import { getApiEndpoint } from "../api/ApiEndpointUtil";

// 會員登入/註冊/忘記密碼/登出
export const FETCH_LOGIN_THUNK = createAsyncThunk(
    "login/fetch",
    async (params: { username: string; password: string; }, { dispatch, rejectWithValue }) => {

        const url = getApiEndpoint("API_MEMBER_LOGIN");

        try {
            let res: Record<string, any> = {};
            await HttpUtil.fetchPost(url, params,
                (response: any) => {
                    res = response;
                    if (response.code === 200) {
                        const data = response.data;
                        saveAuthData(data.jwttoken, data);
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

export const FETCH_SIGN_UP_THUNK = createAsyncThunk(
    "signUp/fetch",
    async (params: { username: string; password: string; password_confirm: string; email: string; gender: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_MEMBER_REGISTER");

            await HttpUtil.fetchPost(url, params,
                (response: any) => {
                    res = response;
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

export const FETCH_FORGOT_THUNK = createAsyncThunk(
    "forgot/fetch",
    async (params: { email: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_MEMBER_FORGOT");

            await HttpUtil.fetchPost(url, params,
                (response: any) => {
                    res = response;
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

export const FETCH_LOGOUT_THUNK = createAsyncThunk(
    "logout/fetch",
    async (_, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_MEMBER_LOOUT");

            await HttpUtil.fetchPost(url, {},
                (response: any) => {
                    res = response;
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

// 充能/開啟無敵
export const FETCH_CHARGE_THUNK = createAsyncThunk(
    "charge/fetch",
    async (_, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_COIN_BUY_CHARGE");

            await HttpUtil.fetchPost(url, {},
                (response: any) => {
                    if (response.code === 200) {
                        res = response;
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

export const FETCH_AD_FREE_THUNK = createAsyncThunk(
    "AdFree/fetch",
    async (params: { type: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_AD_FREE");

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
            return res;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

// 喜愛收藏/按讚作品
export const FETCH_FAVORITE_LIST_THUNK = createAsyncThunk(
    "getFavoriteList/fetch",
    async (params: { page: number; folder_id: string; o: string; }, { dispatch, rejectWithValue }) => {
        try {
            const url = getApiEndpoint("API_FAVORITE_LIST");

            await HttpUtil.fetchGet(url, params,
                (response: any) => {
                    if (response.code === 200) {
                        dispatch(GET_FAVORITE_LIST(response.data));
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

export const FETCH_ADD_FAVORITE_THUNK = createAsyncThunk(
    "addFavorite/fetch",
    async (aid: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_FAVORITE_LIST");

            await HttpUtil.fetchPost(url, { aid },
                (response: any) => {
                    if (response.code === 200) {
                        res = response;
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

export const FETCH_ADD_LIKE_THUNK = createAsyncThunk(
    "addLike/fetch",
    async (params: { id: string | number; like_type?: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_LIKE_DATA");

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
            return res;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

//喜愛收藏資料夾
export const FETCH_EDIT_FAVORITE_FOLDER_THUNK = createAsyncThunk(
    "editFavoriteFolder/fetch",
    async (params: { type: string; folder_id?: string; folder_name?: string; aid?: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_FAVORITE_FOLDER");

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
            return res;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

// tags 收藏
export const FETCH_TAGS_FAVORITE_LIST_THUNK = createAsyncThunk(
    "tagsFavoriteList/fetch",
    async (_, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_TAGS_FAVORITE");

            await HttpUtil.fetchGet(url, {},
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

export const FETCH_TAGS_FAVORITE_UPDATE_THUNK = createAsyncThunk(
    "tagsFavoriteUpdate/fetch",
    async (params: { type: string; tags: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_TAGS_FAVORITE_UPDATE");

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
            return res;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

//成就系統
export const FETCH_TASKS_LIST_THUNK = createAsyncThunk(
    "tasksList/fetch",
    async (params: { type: string; filter?: string; }, { dispatch, rejectWithValue }) => {
        const { type, filter } = params;
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_TASKS_LIST");

            await HttpUtil.fetchGet(url, params,
                (response: any) => {
                    if (response.code === 200) {
                        res = response.data;
                        if (response.data.status === "ok") {
                            dispatch(GET_TASK_LIST({ type, data: response.data }));
                        }
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

export const FETCH_CHANGE_TASKS_THUNK = createAsyncThunk(
    "changeTasks/fetch",
    async (params: { type: string; uid: string; task_id?: string; new_sort_ids?: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_TASKS_LIST");

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
            return res;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

export const FETCH_TASKS_BUY_THUNK = createAsyncThunk(
    "tasksBuy/fetch",
    async (params: { uid: string; task_id?: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_TASKS_BUY_LIST");

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
            return res;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

// 簽到
export const FETCH_GET_DAILY_THUNK = createAsyncThunk(
    "getDaily/fetch",
    async (user_id: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_DAILY");

            await HttpUtil.fetchGet(url, { user_id },
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


export const FETCH_DAILY_CHECK_THUNK = createAsyncThunk(
    "dailySignCheck/fetch",
    async (params: { user_id: string, daily_id: string; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_DAILY_CHECK");

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
            return res;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

export const FETCH_GET_DAILY_OPTION_THUNK = createAsyncThunk(
    "getDailyOption/fetch",
    async (user_id: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_DAILY_LIST");

            await HttpUtil.fetchGet(url, { user_id },
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

export const FETCH_DAILY_LIST_FILTER_THUNK = createAsyncThunk(
    "dailyListFilter/fetch",
    async (data: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_DAILY_LIST_FILTER");

            await HttpUtil.fetchPost(url, { data },
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


// 觀看歷史
export const FETCH_GET_WATCH_LIST_THUNK = createAsyncThunk(
    "getWatchList/fetch",
    async (page: number, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_HISTORY_LIST");

            await HttpUtil.fetchGet(url, { page },
                (response: any) => {
                    if (response.code === 200) {
                        res = response.data;
                        dispatch(GET_WATCH_LIST(response.data));
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

export const FETCH_WATCH_LIST_THUNK = createAsyncThunk(
    "watchListUpdate/fetch",
    async (id: number, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_HISTORY_LIST");

            await HttpUtil.fetchPost(url, { id },
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

// 使用者編輯
export const FETCH_GET_INFO_LIST_THUNK = createAsyncThunk(
    "getInfoList/fetch",
    async (uid: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const baseUrl = getApiEndpoint("API_USEREDIT");
            const url = `${baseUrl}/${uid}`;

            await HttpUtil.fetchGet(url, {},
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

export const FETCH_EDIT_INFO_LIST_THUNK = createAsyncThunk(
    "editInfoList/fetch",
    async (params: { uid: string, formData: Record<string, any>; }, { rejectWithValue }) => {
        const { uid, formData } = params;
        try {
            let res: Record<string, any> = {};


            const baseUrl = getApiEndpoint("API_USEREDIT");
            const url = `${baseUrl}/${uid}`;

            await HttpUtil.fetchPost(url, { ...formData },
                (response: any) => {
                    if (response.code === 200) {
                        res = response;
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

export const FETCH_GET_NOTIFICATIONS_LIST_THUNK = createAsyncThunk(
    "getNotificationsList/fetch",
    async (params: { type?: string; page?: number; }, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOTIFICATIONS");

            await HttpUtil.fetchGet(url, params,
                (response: any) => {
                    if (response.code === 200) {
                        res = response;
                        dispatch(GET_NOTIFICATION_LIST(response.data));
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


export const FETCH_POST_NOTIFICATIONS_THUNK = createAsyncThunk(
    "postNotificationsList/fetch",
    async (params: { id: string; read: number; }, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOTIFICATIONS");

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
            return res;
        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : "數據獲取失敗");
        }
    }
);

export const FETCH_NOTIFICATIONS_UNREAD_THUNK = createAsyncThunk(
    "notificationsUnread/fetch",
    async (_, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOTIFICATIONS_UNREAD");

            await HttpUtil.fetchGet(url, {},
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

export const FETCH_NOTIFICATIONS_SERTRACK_THUNK = createAsyncThunk(
    "notificationsSertrack/fetch",
    async (id: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOTIFICATIONS_SERTRACK");

            await HttpUtil.fetchGet(url, { id },
                (response: any) => {
                    if (response.code === 200) {
                        res = response;
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

export const FETCH_POST_NOTIFICATIONS_SERTRACK_THUNK = createAsyncThunk(
    "postNotificationsSertrack/fetch",
    async (id: string, { rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOTIFICATIONS_SERTRACK");

            await HttpUtil.fetchPost(url, { id },
                (response: any) => {
                    if (response.code === 200) {
                        res = response;
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


export const FETCH_NOTIFICATIONS_TRACK_LIST_THUNK = createAsyncThunk(
    "notificationsTrackList/fetch",
    async (page: number, { dispatch, rejectWithValue }) => {
        try {
            let res: Record<string, any> = {};

            const url = getApiEndpoint("API_NOTIFICATIONS_TRACK_LIST");

            await HttpUtil.fetchPost(url, { page },
                (response: any) => {
                    if (response.code === 200) {
                        res = response;
                        dispatch(GET_TRACKED_LIST(response.data));
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