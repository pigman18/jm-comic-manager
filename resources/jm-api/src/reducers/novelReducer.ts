import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FETCH_NOVEL_CHAPTERS_THUNK, FETCH_NOVEL_DETAIL_THUNK } from "../actions/novelAction";
import createAsyncReducer from "./AsyncReducer";

interface SearchState {
    novelList: { list: any[]; total: number; };
    novelDetail: Record<string, any>;
    novelReadDetail: Record<string, any>;
    novelSearchList: { list: any[]; total: number; redirect_aid: string; search_query: string; };
    novelFavoritesList: { list: any[]; folder_list: any[]; total: number; };
    isLoading: boolean,
    isLoadMore: boolean,
    isRefreshing: boolean,
    hotTagsList: any[],
    randomRecommendList: any[],
}

const initialState: SearchState = {
    novelList: { list: [], total: 0 },
    novelDetail: {},
    novelReadDetail: {},
    novelSearchList: { list: [], total: 0, redirect_aid: "", search_query: "" },
    novelFavoritesList: { list: [], folder_list: [], total: 0 },
    isLoading: true,
    isLoadMore: false,
    isRefreshing: false,
    hotTagsList: [],
    randomRecommendList: [],
};

const novelSlice = createSlice({
    name: "search",
    initialState,
    reducers: {
        LOAD_NOVEL_LIST: (state, action: PayloadAction<any>) => {
            const { isLoading = false, isLoadMore = false, isRefreshing = false } = action.payload || {};
            return {
                ...state,
                isLoading,
                isLoadMore,
                isRefreshing
            };
        },
        GET_NOVEL_LIST: (state, action: PayloadAction<any>) => {
            const { novelList, isLoadMore } = state;
            const { list, total } = action.payload;

            let currentList = { ...novelList };
            currentList.list = isLoadMore ? [...novelList.list, ...list] : list;
            currentList.total = Number(total);
            return {
                ...state,
                novelList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        GET_NOVEL_SEARCH_LIST: (state, action: PayloadAction<any>) => {
            const { novelSearchList, isLoadMore } = state;
            const { list, total } = action.payload;

            let currentList = { ...novelSearchList };
            currentList.list = isLoadMore ? [...novelSearchList.list, ...list] : list;
            currentList.total = Number(total);
            return {
                ...state,
                novelSearchList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        GET_NOVEL_FAVORITES_LIST: (state, action: PayloadAction<any>) => {
            const { novelFavoritesList, isLoadMore } = state;
            const { list, folder_list, count, total } = action.payload;

            let currentList = { ...novelFavoritesList };
            currentList.list = isLoadMore ? [...novelFavoritesList.list, ...list] : list;
            currentList.folder_list = folder_list;
            currentList.total = Number(count);
            return {
                ...state,
                novelFavoritesList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        CLEAR_NOVEL_LIST(state, action: PayloadAction<keyof typeof initialState>) {
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
        RESET_NOVEL_STATE: () => initialState,
    },
    extraReducers: (builder) => {
        createAsyncReducer(FETCH_NOVEL_DETAIL_THUNK, "novelDetail")(builder);
        createAsyncReducer(FETCH_NOVEL_CHAPTERS_THUNK, "novelReadDetail")(builder);
    },
});

export const { LOAD_NOVEL_LIST, GET_NOVEL_LIST, GET_NOVEL_SEARCH_LIST, GET_NOVEL_FAVORITES_LIST, CLEAR_NOVEL_LIST, RESET_NOVEL_STATE } = novelSlice.actions;
export default novelSlice.reducer;
