import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FETCH_DETAIL_THUNK, FETCH_ALBUM_DOWNLOAD_THUNK, FETCH_COMIC_READ_THUNK } from "../actions/detailAction";
import createAsyncReducer from "./AsyncReducer";

interface DetailState {
    detailList: Record<string, any>;
    albumDownloadDetail: Record<string, any>;
    readList: Record<string, any>;
    isLoading: boolean;
    isRefreshing: boolean;
    isLoadMore: boolean;
}

const initialState: DetailState = {
    detailList: {},
    albumDownloadDetail: {},
    readList: {},
    isLoading: true,
    isRefreshing: false,
    isLoadMore: false,
};

const detailSlice = createSlice({
    name: "detail",
    initialState,
    reducers: {
        LOAD_COMBIC_DETIAL_LIST: (state, action: PayloadAction<any>) => {
            const { isLoading = false, isLoadMore = false, isRefreshing = false } = action.payload || {};
            return {
                ...state,
                isLoading,
                isLoadMore,
                isRefreshing
            };
        },
        CLEAR_DETIAL_LIST(state, action: PayloadAction<keyof typeof initialState>) {
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
        RESET_DETAIL_STATE: () => initialState,
    },
    extraReducers: (builder) => {
        createAsyncReducer(FETCH_DETAIL_THUNK, "detailList")(builder);
        createAsyncReducer(FETCH_ALBUM_DOWNLOAD_THUNK, "albumDownloadDetail")(builder);
        createAsyncReducer(FETCH_COMIC_READ_THUNK, "readList")(builder);
    },
});

export const { LOAD_COMBIC_DETIAL_LIST, CLEAR_DETIAL_LIST, RESET_DETAIL_STATE } = detailSlice.actions;
export default detailSlice.reducer;
