import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import createAsyncReducer from "./AsyncReducer";
import { FETCH_MOVIE_PLAYER_THUNK } from "../actions/moviesPlayerAction";

interface MoviesPlayerState {
    moviesDetail: Record<string, any>;
    isLoading: boolean;
    isRefreshing: boolean;
}

const initialState: MoviesPlayerState = {
    moviesDetail: {},
    isLoading: true,
    isRefreshing: false,
};

const moviesPlayerSlice = createSlice({
    name: 'moviesPlayer',
    initialState,
    reducers: {

        SET_VIDEO_LOADING(state, action: PayloadAction<boolean>) {
            state.isLoading = action.payload;
        },
        SET_MOVIES_DETAIL(state, action: PayloadAction<Record<string, any>>) {
            state.moviesDetail = action.payload;
            state.isLoading = false;
        },
        RESET_MOVIES_PLAYER(state) {
            state.moviesDetail = {};
            state.isLoading = true;
        },
    },
    extraReducers: (builder) => {
        createAsyncReducer(FETCH_MOVIE_PLAYER_THUNK, 'videoDetail')(builder);
    },
});
export const { SET_VIDEO_LOADING, SET_MOVIES_DETAIL, RESET_MOVIES_PLAYER } = moviesPlayerSlice.actions;
export default moviesPlayerSlice.reducer;
