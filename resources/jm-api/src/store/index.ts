// store.ts
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./rootReducer";
import { ThunkDispatch } from "redux-thunk";

const store = configureStore({
  reducer: rootReducer,
});

// 自動推斷 RootState 類型
export type RootState = ReturnType<typeof rootReducer>;
// 自定義 AppDispatch 類型
export type AppDispatch = ThunkDispatch<RootState, unknown, any>;

export default store;
