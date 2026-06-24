import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FETCH_FORUM_SEND_THUNK } from "../actions/forumAction";
import createAsyncReducer from "./AsyncReducer";

interface ForumState {
  forumList: { total: number; list: any[]; };
  isLoading: boolean;
  isLoadMore: boolean;
  isRefreshing: boolean;
  isCommentResultLoading: boolean;
  commentResult: Record<string, any>;
  voteData: Record<string, any>;
  isVoteLoading: boolean;
}

const initialState: ForumState = {
  forumList: { total: 0, list: [] },
  isLoading: true,
  isLoadMore: false,
  isRefreshing: false,
  isCommentResultLoading: false,
  commentResult: [],
  voteData: [],
  isVoteLoading: false,
};

const forumSlice = createSlice({
  name: "forum",
  initialState,
  reducers: {
    LOAD_FORUM_LIST: (state, action: PayloadAction<any>) => {
      return {
        ...state,
        isLoading: action.payload.isLoading,
        isLoadMore: action.payload.isLoadMore,
        isRefreshing: action.payload.isRefreshing,
      };
    },
    GET_FORUM_LIST: (state, action: PayloadAction<any>) => {
      const { forumList, isLoadMore } = state;
      const { list, total } = action.payload;

      let currentList = { ...forumList };
      currentList.list = isLoadMore ? [...forumList.list, ...list] : list;
      currentList.total = total;
      return {
        ...state,
        forumList: currentList,
        isLoading: false,
        isLoadMore: false,
        isRefreshing: false,
      };
    },
    CLEAR_FORUM_LIST(state, action: PayloadAction<keyof typeof initialState>) {
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
    RESET_FORUM_STATE: () => initialState,
  },
  extraReducers: (builder) => {
    createAsyncReducer(FETCH_FORUM_SEND_THUNK, "commentResult")(builder);
  }
});

export const { LOAD_FORUM_LIST, GET_FORUM_LIST, CLEAR_FORUM_LIST, RESET_FORUM_STATE } = forumSlice.actions;
export default forumSlice.reducer;
