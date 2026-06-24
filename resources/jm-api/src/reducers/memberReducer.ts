import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FETCH_LOGIN_THUNK, FETCH_SIGN_UP_THUNK, FETCH_FORGOT_THUNK, FETCH_LOGOUT_THUNK, FETCH_CHARGE_THUNK, FETCH_AD_FREE_THUNK, FETCH_TAGS_FAVORITE_LIST_THUNK, FETCH_EDIT_FAVORITE_FOLDER_THUNK, FETCH_TAGS_FAVORITE_UPDATE_THUNK, FETCH_TASKS_LIST_THUNK, FETCH_CHANGE_TASKS_THUNK, FETCH_TASKS_BUY_THUNK, FETCH_GET_DAILY_THUNK, FETCH_DAILY_CHECK_THUNK, FETCH_GET_DAILY_OPTION_THUNK, FETCH_DAILY_LIST_FILTER_THUNK, FETCH_GET_INFO_LIST_THUNK, FETCH_EDIT_INFO_LIST_THUNK, FETCH_ADD_LIKE_THUNK, FETCH_ADD_FAVORITE_THUNK, FETCH_POST_NOTIFICATIONS_THUNK, FETCH_NOTIFICATIONS_UNREAD_THUNK, FETCH_NOTIFICATIONS_SERTRACK_THUNK } from "../actions/memberAction";
import createAsyncReducer from "./AsyncReducer";

interface MemberState {
    info: Record<string, any>;
    favoriteList: { list: any[]; folder_list: any[]; total: number; count: number; };
    tagsList: { list: any[]; };
    tasksList: { all: any[]; coin: any[]; exp: any[]; msg: string; };
    dailyList: Record<string, any>;
    dailyOption: { list: any[]; };
    dailyFilter: Record<string, any>;
    watchList: { list: any[]; total: number; };
    trackedList: { list: any[]; total: number; };
    notificationList: { list: any[]; total: number; };
    unread: Record<string, any>;
    notifResult: Record<string, any>,
    infoList: Record<string, any>;
    memberResult: Record<string, any>;
    editResult: Record<string, any>,
    isLoading: boolean;
    isLoadMore: boolean;
    isInfoLoading: boolean;
    isInfoRefreshing: boolean;
    isRefreshing: boolean;
    error: string;
    chargeAdsLoading: boolean;
}

const initialState: MemberState = {
    info: {},
    favoriteList: { list: [], folder_list: [], total: 0, count: 0 },
    tagsList: { list: [] },
    tasksList: { all: [], coin: [], exp: [], msg: "" },
    dailyList: {},
    dailyOption: { list: [] },
    dailyFilter: {},
    watchList: { list: [], total: 0 },
    trackedList: { list: [], total: 0 },
    notificationList: { list: [], total: 0 },
    unread: {},
    notifResult: {},
    infoList: {},
    memberResult: {},
    editResult: {},
    isLoading: false,
    isLoadMore: false,
    isRefreshing: false,
    isInfoLoading: false,
    isInfoRefreshing: false,
    error: "",
    chargeAdsLoading: false
};

const memberSlice = createSlice({
    name: "member",
    initialState,
    reducers: {
        LOAD_MEMBER_INFO_LIST: (state, action: PayloadAction<any>) => {
            const { isInfoLoading = false, isInfoRefreshing = false } = action.payload || {};
            return {
                ...state,
                isInfoLoading,
                isInfoRefreshing
            };
        },
        LOAD_MEMBER_LIST: (state, action: PayloadAction<any>) => {
            const { isLoading = false, isLoadMore = false, isRefreshing = false } = action.payload || {};
            return {
                ...state,
                isLoading,
                isLoadMore,
                isRefreshing
            };
        },
        SET_ERROR: (state, action: PayloadAction<any>) => {
            return {
                ...state,
                errorMsg: action.payload.errorMsg,
                isLoading: false,
            };
        },
        GET_FAVORITE_LIST: (state, action: PayloadAction<any>) => {
            const { favoriteList, isLoadMore } = state;
            const { list, count, folder_list, total } = action.payload;
            let currentList = { ...favoriteList };
            currentList.list = isLoadMore ? [...favoriteList.list, ...list] : list;
            currentList.total = Number(total);
            currentList.count = Number(count);
            currentList.folder_list = folder_list;
            return {
                ...state,
                favoriteList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };

        },
        GET_TASK_LIST: (state, action: PayloadAction<any>) => {
            const { tasksList } = state;
            const { list, msg } = action.payload.data;
            const { type } = action.payload;
            const currentList = { ...tasksList, msg };

            switch (type) {
                case "title":
                case "badge":
                    currentList.all = list;
                    break;
                case "coin":
                    currentList.coin = list;
                    break;
                case "exp":
                    currentList.exp = list;
                    break;
                default:
                    currentList.all = list;
                    break;
            }

            return {
                ...state,
                tasksList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        GET_WATCH_LIST: (state, action: PayloadAction<any>) => {
            const { watchList, isLoadMore } = state;
            const { list, total } = action.payload;

            let currentList = { ...watchList };
            currentList.list = isLoadMore ? [...watchList.list, ...list] : list;
            currentList.total = Number(total);
            return {
                ...state,
                watchList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        GET_TRACKED_LIST: (state, action: PayloadAction<any>) => {
            const { trackedList, isLoadMore } = state;
            const { item, totalCnt } = action.payload;

            let currentList = { ...trackedList };
            currentList.list = isLoadMore ? [...trackedList.list, ...item] : item;
            currentList.total = Number(totalCnt);
            return {
                ...state,
                trackedList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        GET_NOTIFICATION_LIST: (state, action: PayloadAction<any>) => {
            const { notificationList, isLoadMore } = state;
            const list = action.payload;

            let currentList = { ...notificationList };
            currentList.list = isLoadMore ? [...notificationList.list, ...list] : list;
            return {
                ...state,
                notificationList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        CLEAR_MEMBER_LIST(state, action: PayloadAction<keyof typeof initialState>) {
            const listName = action.payload;
            const target = state[listName];

            if (Array.isArray(target)) {
                target.length = 0;
            } else if (target && typeof target === 'object') {
                Object.keys(target).forEach(key => {
                    delete (target as Record<string, any>)[key];
                });
            }
        },
        RESET_MEMBER_STATE: () => initialState,
    },
    extraReducers: (builder) => {
        createAsyncReducer(FETCH_LOGIN_THUNK, "info")(builder);
        createAsyncReducer(FETCH_SIGN_UP_THUNK, "memberResult")(builder);
        createAsyncReducer(FETCH_FORGOT_THUNK, "memberResult")(builder);
        createAsyncReducer(FETCH_LOGOUT_THUNK, "memberResult")(builder);
        createAsyncReducer(FETCH_CHARGE_THUNK, "memberResult", "chargeAdsLoading")(builder);
        createAsyncReducer(FETCH_AD_FREE_THUNK, "memberResult", "chargeAdsLoading")(builder);
        createAsyncReducer(FETCH_EDIT_FAVORITE_FOLDER_THUNK, "editResult")(builder);
        createAsyncReducer(FETCH_TAGS_FAVORITE_LIST_THUNK, "tagsList")(builder);
        createAsyncReducer(FETCH_TAGS_FAVORITE_UPDATE_THUNK, "editResult")(builder);
        // createAsyncReducer(FETCH_TASKS_LIST_THUNK, "tasksList")(builder);
        createAsyncReducer(FETCH_CHANGE_TASKS_THUNK, "editResult")(builder);
        createAsyncReducer(FETCH_TASKS_BUY_THUNK, "editResult")(builder);
        createAsyncReducer(FETCH_GET_DAILY_THUNK, "dailyList")(builder);
        createAsyncReducer(FETCH_DAILY_CHECK_THUNK, "memberResult")(builder);
        createAsyncReducer(FETCH_GET_DAILY_OPTION_THUNK, "dailyOption")(builder);
        createAsyncReducer(FETCH_DAILY_LIST_FILTER_THUNK, "dailyFilter")(builder);
        createAsyncReducer(FETCH_GET_INFO_LIST_THUNK, "infoList")(builder);
        createAsyncReducer(FETCH_EDIT_INFO_LIST_THUNK, "editResult")(builder);
        createAsyncReducer(FETCH_ADD_LIKE_THUNK, "editResult")(builder);
        createAsyncReducer(FETCH_ADD_FAVORITE_THUNK, "editResult")(builder);
        createAsyncReducer(FETCH_NOTIFICATIONS_UNREAD_THUNK, "unread")(builder);
        createAsyncReducer(FETCH_POST_NOTIFICATIONS_THUNK, "notifResult")(builder);
        createAsyncReducer(FETCH_NOTIFICATIONS_SERTRACK_THUNK, "notifResult")(builder);
    }
});

export const { LOAD_MEMBER_INFO_LIST, LOAD_MEMBER_LIST, SET_ERROR, GET_FAVORITE_LIST, GET_TASK_LIST, GET_WATCH_LIST, GET_TRACKED_LIST, GET_NOTIFICATION_LIST, CLEAR_MEMBER_LIST, RESET_MEMBER_STATE } = memberSlice.actions;
export default memberSlice.reducer;
