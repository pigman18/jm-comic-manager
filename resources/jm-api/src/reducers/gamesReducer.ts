import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FETCH_BANNERS_THUNK, FETCH_CATEGORIES_THUNK } from "../actions/gamesAction";
import createAsyncReducer from "./AsyncReducer";

interface GamesItem {
    gid: string;
    title: string;
    description: string;
    tags: string;
    link: string;
    photo: string;
    type: string[];
    categories: {
        name: string;
    };
}

interface GamesCategory {
    name: string;
    slug: string;
    game_types: {
        name: string;
        slug: string;
    }[];
}


// 資料型別
interface GamesState {
    games: GamesItem[];
    hotGames: GamesItem[];
    categories: GamesCategory[];
    bannerList: any[];
    totalGames: number,
    page: number,
    isLoading: boolean;
    isLoadMore: boolean;
    isRefreshing: boolean;
    hasMore: boolean;
    isMoreListLoadMore: boolean,
    isMoreListLoading: boolean,
    isMoreListRefreshing: boolean,
}

// 初始值
const initialState: GamesState = {
    games: [],
    hotGames: [],
    categories: [],
    bannerList: [],
    totalGames: 0,
    page: 1,
    isLoading: true,
    isLoadMore: false,
    isRefreshing: false,
    hasMore: true,
    isMoreListLoadMore: false,
    isMoreListLoading: false,
    isMoreListRefreshing: false,
};

const gamesSlice = createSlice({
    name: "games",
    initialState,
    reducers: {
        LOAD_GAMES_LIST: (state, action: PayloadAction<any>) => {
            const {
                isLoading = false,
                isLoadMore = false,
                isRefreshing = false,
            } = action.payload || {};
            state.isLoading = isLoading;
            state.isLoadMore = isLoadMore;
            state.isRefreshing = isRefreshing;
        },
        SET_CATEGORIES: (state, action: PayloadAction<{ categories: GamesCategory[]; }>) => {
            state.categories = action.payload.categories;
        },
        GET_GAMES_LIST: (state, action: PayloadAction<{
            games: GamesItem[];
            hotGames: GamesItem[];
            categories: GamesCategory[];
            games_total: number;
        }>) => {
            state.games = action.payload.games;
            state.hotGames = action.payload.hotGames;
            state.page = 1;
            state.categories = action.payload.categories;
            state.isLoading = false;
            state.isLoadMore = false;
            state.hasMore = action.payload.games.length === 18;

        },
        LOAD_MORE_LIST: (state, action: PayloadAction<{
            isMoreListLoadMore: boolean;
            isMoreListLoading: boolean;
            isMoreListRefreshing: boolean;
        }>) => {
            state.isMoreListLoadMore = action.payload.isMoreListLoadMore;
            state.isMoreListLoading = action.payload.isMoreListLoading;
            state.isMoreListRefreshing = action.payload.isMoreListRefreshing;
        },
        INCREMENT_PAGE: (state) => {
            state.page += 1;
        },
        APPEND_GAMES_LIST: (
            state,
            action: PayloadAction<{
                games: GamesItem[];
                games_total: number;
                categories: GamesCategory[];
            }>
        ) => {
            state.games = [...state.games, ...action.payload.games];
            state.hasMore = action.payload.games.length === 18;
            state.isLoadMore = false;
            if (action.payload.categories) {
                state.categories = action.payload.categories;
            }
        },
        CLEAR_GAMES_LIST: (state) => {
            state.games = [];
            state.hotGames = [];
            state.hasMore = true;
        },
        RESET_GAMES_STATE: (state) => {
            state.games = [];
            state.totalGames = 0;
            state.page = 1;
            state.hasMore = true;
            state.isLoading = false;
            state.isLoadMore = false;
            state.isRefreshing = false;
        },
        GET_GAMES_BANNERS: (state, action: PayloadAction<any>) => {
            state.bannerList = action.payload;
        },
        CLEAR_GAMES_BANNERS: (state) => {
            state.bannerList = [];
        },
    },
    extraReducers: (builder) => {
        // createAsyncReducer(FETCH_GAMES_LIST_THUNK, "gamesList")(builder); 
        createAsyncReducer(FETCH_BANNERS_THUNK, "bannerList")(builder);
        createAsyncReducer(FETCH_CATEGORIES_THUNK, "categories")(builder);
    }
});
export const { LOAD_GAMES_LIST, SET_CATEGORIES, GET_GAMES_LIST, APPEND_GAMES_LIST, RESET_GAMES_STATE, GET_GAMES_BANNERS, LOAD_MORE_LIST, CLEAR_GAMES_LIST, CLEAR_GAMES_BANNERS } = gamesSlice.actions;
export default gamesSlice.reducer;
