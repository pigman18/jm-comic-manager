import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FETCH_CATEGORIES_LIST_THUNK } from "../actions/categoriesAction";
import createAsyncReducer from "./AsyncReducer";

interface CategoriesState {
    categoriesList: Record<string, any>;
    cateFilterList: { list: any[]; tags: any[]; total: number; search_query: string; };
    isLoading: boolean;
    isLoadMore: boolean;
    isRefreshing: boolean;
}

const initialState: CategoriesState = {
    categoriesList: {},
    cateFilterList: { list: [], tags: [], total: 0, search_query: "" },
    isLoading: true,
    isLoadMore: false,
    isRefreshing: false,
};

const categoriesSlice = createSlice({
    name: "categories",
    initialState,
    reducers: {
        LOAD_CATEGORIES_LIST: (state, action: PayloadAction<any>) => {
            const { isLoading = false, isLoadMore = false, isRefreshing = false } = action.payload || {};
            return {
                ...state,
                isLoading,
                isLoadMore,
                isRefreshing
            };
        },
        GET_CATEGORIES_FILTER_LIST: (state, action: PayloadAction<any>) => {
            const { cateFilterList, isLoadMore } = state;
            const { content, tags, total, search_query } = action.payload;
            return {
                ...state,
                cateFilterList: {
                    ...cateFilterList,
                    list: isLoadMore ? [...cateFilterList.list, ...content] : content,
                    tags,
                    total: Number(total),
                    search_query
                },
                isLoading: false,
                isRefreshing: false,
                isLoadMore: false,
            };
        },
        CLEAR_CATEGORIES_LIST(state, action: PayloadAction<keyof typeof initialState>) {
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
        RESET_CATEGORIES_FILTER_STATE: () => initialState,
    },
    extraReducers: (builder) => {
        createAsyncReducer(FETCH_CATEGORIES_LIST_THUNK, "categoriesList")(builder);
    }
});

export const { LOAD_CATEGORIES_LIST, GET_CATEGORIES_FILTER_LIST, CLEAR_CATEGORIES_LIST, RESET_CATEGORIES_FILTER_STATE } = categoriesSlice.actions;
export default categoriesSlice.reducer;
