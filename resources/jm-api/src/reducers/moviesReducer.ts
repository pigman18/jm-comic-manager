import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { FETCH_MOVIES_LIST_THUNK, FETCH_LATEST_HANIME_THUNK, FETCH_MOVIES_BANNERS_THUNK } from '../actions/moviesAction';
import createAsyncReducer from "./AsyncReducer";


export interface List {
    id: string;
    photo: string;
    photo_str: string;
    title: string;
    tags: string[];
    backlink: string;
}
interface LatestHanime {
    id: string;
    photo: string;
    title: string;
}


interface moviesState {
    moviesList: { list: List[], total: number; };
    exclusiveList: { list: List[], total: number; };
    latestHanime: LatestHanime[];
    isLoading: boolean;
    isLoadMore: boolean;
    isRefreshing: boolean;
    selectedVideoType: string;
    selectedSearchQuery: string;
}


const initialState: moviesState = {
    moviesList: { list: [], total: 0 },
    exclusiveList: { list: [], total: 0 },
    latestHanime: [],
    isLoading: true,
    isLoadMore: false,
    isRefreshing: false,
    selectedVideoType: "movie",
    selectedSearchQuery: "",
};


const moviesSlice = createSlice({
    name: "movies",
    initialState,
    reducers: {
        LOAD_MOVIES_LIST: (state, action: PayloadAction<any>) => {


            return {
                ...state,
                isLoading: action.payload.isLoading,
                isLoadMore: action.payload.isLoadMore,
                isRefreshing: action.payload.isRefreshing,
            };
        },
        GET_MOVIES_LIST: (state, action: PayloadAction<any>) => {
            const { moviesList, isLoadMore } = state;
            const { list, total } = action.payload;

            let currentList = { ...moviesList };
            currentList.list = isLoadMore ? [...moviesList.list, ...list] : list;
            currentList.total = Number(total);

            return {
                ...state,
                moviesList: { list: currentList.list, total: currentList.total },
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        GET_EXCLUSIVE_LIST: (state, action: PayloadAction<any>) => {
            const { list, total } = action.payload;
            return {
                ...state,
                exclusiveList: { list: list, total: total },
                isLoading: false,
                isLoadMore: false,
                isRefreshing: false,
            };
        },
        CLEAR_MOVIES_STATE(state, action: PayloadAction<keyof typeof initialState>) {
            const listName = action.payload;
            const target = state[listName];
            if (Array.isArray(target)) {
                target.length = 0;
            } else if (target && typeof target === "object") {
                Object.keys(target).forEach((key) => {
                    delete (target as Record<string, any>)[key];
                });
            }
        },


        RESET_MOVIES_STATE: () => initialState,


        SET_SELECTED_VIDEOTYPE: (state, action: PayloadAction<string>) => {
            state.selectedVideoType = action.payload;
        },


        SET_SELECTED_SEARCHQUERY(state, action: PayloadAction<string>) {
            state.selectedSearchQuery = action.payload;
        },
    },
    extraReducers: (builder) => {
        createAsyncReducer(FETCH_LATEST_HANIME_THUNK, "latestHanime")(builder);
        // createAsyncReducer(FETCH_MOVIES_BANNERS_THUNK, "bannerList")(builder);
    }
});


export const { LOAD_MOVIES_LIST, GET_MOVIES_LIST, GET_EXCLUSIVE_LIST, RESET_MOVIES_STATE, CLEAR_MOVIES_STATE, SET_SELECTED_VIDEOTYPE, SET_SELECTED_SEARCHQUERY } = moviesSlice.actions;
export default moviesSlice.reducer;
