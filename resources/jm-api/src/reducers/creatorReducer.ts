import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import createAsyncReducer from "./AsyncReducer";
import { FETCH_CREATOR_WORK_INFO_THUNK, FETCH_CREATOR_WORK_INFO_DETAIL_THUNK } from "../actions/creatorAction";
interface CreatorState {
    creatorAuthorList: { total: number; list: any[]; };
    creatorWorkList: { total: number; list: any[]; filters: Record<string, any>; };
    creatorAuthorWorkList: { list: Record<string, any>; filters: Record<string, any>; };
    creatorWorkInfo: Record<string, any>;
    creatorWorkInfoDetail: Record<string, any>;
    isLoading: boolean;
    isLoadMore: boolean;
    isRefreshing: boolean;
}

const initialState: CreatorState = {
    creatorAuthorList: { total: 0, list: [] },
    creatorWorkList: { total: 0, list: [], filters: {} },
    creatorAuthorWorkList: { list: {}, filters: {} },
    creatorWorkInfo: {},
    creatorWorkInfoDetail: {},
    isLoading: true,
    isLoadMore: false,
    isRefreshing: false,
};

const creatorSlice = createSlice({
    name: "creator",
    initialState,
    reducers: {
        LOAD_CREATOR_LIST: (state, action: PayloadAction<any>) => {
            const { isLoading = false, isLoadMore = false, isRefreshing = false } = action.payload || {};
            return {
                ...state,
                isLoading,
                isLoadMore,
                isRefreshing
            };
        },
        GET_CREATOR_AUTHOR_LIST: (state, action: PayloadAction<any>) => {
            const { creatorAuthorList, isLoadMore } = state;
            const { content, total } = action.payload;
            let currentList = { ...state.creatorAuthorList };
            currentList.list = isLoadMore ? [...creatorAuthorList.list, ...content] : content;
            currentList.total = Number(total);
            return {
                ...state,
                creatorAuthorList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        GET_CREATOR_WORK_LIST: (state, action: PayloadAction<any>) => {
            const { creatorWorkList, isLoadMore } = state;
            const { content, total, filters } = action.payload;
            let currentList = { ...state.creatorWorkList };

            const updatedFilters = Object.fromEntries(
                Object.entries(filters).map(([key, value]) => [
                    key, Array.isArray(value) ? ["All", ...value] : value === null ? ["All"] : [value]
                ])
            );
            currentList.list = isLoadMore ? [...creatorWorkList.list, ...content] : content;
            currentList.filters = updatedFilters;
            currentList.total = Number(total);

            return {
                ...state,
                creatorWorkList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },

        GET_CREATOR_AUTHOR_WORK_LIST: (state, action: PayloadAction<any>) => {
            let data = action.payload;
            let currentList = { ...state.creatorAuthorWorkList };

            const updatedFilters = Object.fromEntries(
                Object.entries(data.filters).map(([key, value]) => [
                    key, Array.isArray(value) ? ["All", ...value] : value === null ? ["All"] : [value]
                ])
            );
            currentList.list = data;
            currentList.filters = updatedFilters;

            return {
                ...state,
                creatorAuthorWorkList: currentList,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        GET_CREATOR_WORK_INFO: (state, action: PayloadAction<any>) => {
            return {
                ...state,
                creatorWorkInfo: action.payload,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        GET_CREATOR_WORK_INFO_DETAIL: (state, action: PayloadAction<any>) => {
            return {
                ...state,
                creatorWorkInfoDetail: action.payload,
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        CLEAR_CREATOR_LIST(state, action: PayloadAction<keyof typeof initialState>) {
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
        RESET_CREATOR_LIST_STATE: () => initialState,
    },
    extraReducers: (builder) => {
        createAsyncReducer(FETCH_CREATOR_WORK_INFO_THUNK, "creatorWorkInfo")(builder);
        createAsyncReducer(FETCH_CREATOR_WORK_INFO_DETAIL_THUNK, "creatorWorkInfoDetail")(builder);
    }
});

export const { LOAD_CREATOR_LIST, GET_CREATOR_AUTHOR_LIST, GET_CREATOR_AUTHOR_WORK_LIST, GET_CREATOR_WORK_LIST, GET_CREATOR_WORK_INFO, GET_CREATOR_WORK_INFO_DETAIL, CLEAR_CREATOR_LIST, RESET_CREATOR_LIST_STATE } = creatorSlice.actions;
export default creatorSlice.reducer;
