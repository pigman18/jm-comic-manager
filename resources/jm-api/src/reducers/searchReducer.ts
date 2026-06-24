import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FETCH_SEARCH_THUNK, FETCH_HOT_TAGS_THUNK, FETCH_RECOMMEND_THUNK } from "../actions/searchAction";
import createAsyncReducer from "./AsyncReducer";

interface SearchState {
    searchList: { list: any[]; total: number; redirect_aid: string; search_query: string; };
    isLoading: boolean,
    isLoadMore: boolean,
    isRefreshing: boolean,
    hotTagsList: any[],
    randomRecommendList: any[],
}

const initialState: SearchState = {
    searchList: { list: [], total: 0, redirect_aid: "", search_query: "" },
    isLoading: true,
    isLoadMore: false,
    isRefreshing: false,
    hotTagsList: [],
    randomRecommendList: [],
};

const searchSlice = createSlice({
    name: "search",
    initialState,
    reducers: {
        LOAD_SEARCH_LIST: (state, action: PayloadAction<any>) => {
            const { isLoading = false, isLoadMore = false, isRefreshing = false } = action.payload || {};
            return {
                ...state,
                isLoading,
                isLoadMore,
                isRefreshing
            };
        },
        GET_SEARCH_LIST: (state, action: PayloadAction<any>) => {
            const { searchList, isLoadMore } = state;
            const { content, redirect_aid, search_query, total } = action.payload;

            let currentList = { ...searchList };
            currentList.list = isLoadMore ? [...searchList.list, ...content] : content;
            currentList.redirect_aid = redirect_aid;
            currentList.search_query = search_query;
            currentList.total = Number(total);
            return {
                ...state,
                searchList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        CLEAR_SEARCH_LIST(state, action: PayloadAction<keyof typeof initialState>) {
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
        RESET_SEARCH_STATE: () => initialState,
    },
    extraReducers: (builder) => {
        createAsyncReducer(FETCH_HOT_TAGS_THUNK, "hotTagsList")(builder);
        createAsyncReducer(FETCH_RECOMMEND_THUNK, "randomRecommendList")(builder);
    },
});

export const { LOAD_SEARCH_LIST, GET_SEARCH_LIST, CLEAR_SEARCH_LIST, RESET_SEARCH_STATE } = searchSlice.actions;
export default searchSlice.reducer;
