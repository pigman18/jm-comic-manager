import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FETCH_WEEK_THUNK, FETCH_WEEK_FILTER_THUNK } from "../actions/weekAction";
import createAsyncReducer from "./AsyncReducer";

interface WeekState {
  list: Record<string, any>;
  weekList: Record<string, any>;
  weekFilterList: Record<string, any>;
  isLoading: boolean;
  isLoadMore: boolean;
  isRefreshing: boolean;
}

const initialState: WeekState = {
  list: {},
  weekList: {},
  weekFilterList: {},
  isLoading: true,
  isLoadMore: false,
  isRefreshing: false,
};

const weekSlice = createSlice({
  name: "week",
  initialState,
  reducers: {
    LOAD_WEEK_LIST: (state, action: PayloadAction<any>) => {
      return {
        ...state,
        isLoading: action.payload.isLoading,
        isLoadMore: action.payload.isLoadMore,
        isRefreshing: action.payload.isRefreshing,
      };
    },
    GET_WEEK_LIST: (state, action: PayloadAction<any>) => {
      return {
        ...state,
        weekList: action.payload,
        isLoading: false,
      };
    },
    GET_WEEK_FILTER_LIST: (state, action: PayloadAction<any>) => {
      return {
        ...state,
        weekFilterList: action.payload,
        isLoading: false,
      };
    },
  },
  extraReducers: (builder) => {
    createAsyncReducer(FETCH_WEEK_THUNK, "weekList")(builder);
    createAsyncReducer(FETCH_WEEK_FILTER_THUNK, "weekFilterList")(builder);
  }
});

export const { LOAD_WEEK_LIST, GET_WEEK_LIST, GET_WEEK_FILTER_LIST } = weekSlice.actions;
export default weekSlice.reducer;
