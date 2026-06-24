import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { FETCH_GET_SETTINGS_THUNK, FETCH_SETTINGS_THUNK } from "../actions/settingAction";
import createAsyncReducer from "./AsyncReducer";

interface SettingsState {
  isLoading: boolean;
  info: Record<string, any>;
  lang: string;
  darkMode: boolean;
}

const initialState: SettingsState = {
  isLoading: false,
  info: {},
  lang: "en",
  darkMode: false,
};

const settingsSlice = createSlice({
  name: "settings",
  initialState,
  reducers: {
    GET_SETTING_INFO: (state, action: PayloadAction<any>) => {
      state.info = action.payload;
    },
    LOAD_SETTING_INFO: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    SET_SETTING_LANG: (state, action: PayloadAction<string>) => {
      state.lang = action.payload;
    },
    SET_SETTING_DARK: (state, action: PayloadAction<boolean>) => {
      state.darkMode = action.payload;
    },
  },
  extraReducers: (builder) => {
    createAsyncReducer(FETCH_GET_SETTINGS_THUNK, "info")(builder);
    createAsyncReducer(FETCH_SETTINGS_THUNK, "info")(builder);
  },
});

export const { GET_SETTING_INFO, LOAD_SETTING_INFO, SET_SETTING_LANG, SET_SETTING_DARK } =
  settingsSlice.actions;
export default settingsSlice.reducer;
