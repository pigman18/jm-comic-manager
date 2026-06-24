import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FETCH_BLOGS_LIST_THUNK, FETCH_BLOGS_INFO_THUNK, FETCH_GAME_INFO_THUNK } from "../actions/blogsAction";
import createAsyncReducer from "./AsyncReducer";
interface BlogsState {
    blogsList: { list: any[]; total: number; };
    blogsInfo: Record<string, any>;
    gamesInfo: Record<string, any>;
    isBlogLoading: boolean;
    isLoadMore: boolean;
    isRefreshing: boolean;
}

const initialState: BlogsState = {
    blogsList: { list: [], total: 0 },
    blogsInfo: {},
    gamesInfo: {},
    isBlogLoading: true,
    isLoadMore: false,
    isRefreshing: false,
};

const blogsSlice = createSlice({
    name: "blogs",
    initialState,
    reducers: {
        LOAD_BLOGS_LIST: (state, action: PayloadAction<any>) => {
            const { isBlogLoading = false, isLoadMore = false, isRefreshing = false } = action.payload || {};
            return {
                ...state,
                isBlogLoading,
                isLoadMore,
                isRefreshing
            };
        },
        GET_BLOGS_LIST: (state, action: PayloadAction<any>) => {
            const { blogsList, isLoadMore } = state;
            const { list, count } = action.payload;

            let currentList = { ...blogsList };
            currentList.list = isLoadMore ? [...blogsList.list, ...list] : list;
            currentList.total = Number(count);
            return {
                ...state,
                blogsList: currentList,
                isBlogLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        CLEAR_BLOG_STATE(state, action: PayloadAction<keyof typeof initialState>) {
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
        RESET_BLOG_STATE: () => initialState,
    },
    extraReducers: (builder) => {
        createAsyncReducer(FETCH_BLOGS_INFO_THUNK, "blogsInfo", "isBlogLoading")(builder);
        createAsyncReducer(FETCH_GAME_INFO_THUNK, "gamesInfo", "isBlogLoading")(builder);
    }
});

export const { LOAD_BLOGS_LIST, GET_BLOGS_LIST, CLEAR_BLOG_STATE, RESET_BLOG_STATE } = blogsSlice.actions;
export default blogsSlice.reducer;
