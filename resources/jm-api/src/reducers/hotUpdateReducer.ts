import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface hotUpdateState {
    hotUpdateEnabled: boolean;
    hotUpdateModalProgress: number;
    newVersion: string;
    showHotUpdateModal: boolean;
}

const initialState: hotUpdateState = {
    hotUpdateEnabled: false,
    hotUpdateModalProgress: 0,
    newVersion: "",
    showHotUpdateModal: false
};

const hotUpdateSlice = createSlice({
    name: "hotUpdate",
    initialState,
    reducers: {
        SET_HOT_UPDATE_ENABLED: (state, action: PayloadAction<boolean>) => {
            state.hotUpdateEnabled = action.payload;
        },
        SET_HOT_UPDATE_MODAL_PROGRESS: (state, action: PayloadAction<number>) => {
            state.hotUpdateModalProgress = action.payload;
        },
        SET_NEW_VERSION: (state, action: PayloadAction<string>) => {
            state.newVersion = action.payload;
        },
        SET_SHOW_HOT_UPDATE_MODAL: (state, action: PayloadAction<boolean>) => {
            state.showHotUpdateModal = action.payload;
        },
    },
    extraReducers: (builder) => {
    }
});

export const { SET_HOT_UPDATE_ENABLED, SET_HOT_UPDATE_MODAL_PROGRESS, SET_NEW_VERSION, SET_SHOW_HOT_UPDATE_MODAL } = hotUpdateSlice.actions;
export default hotUpdateSlice.reducer;
