import { PayloadAction } from "@reduxjs/toolkit";
import { AsyncThunk } from '@reduxjs/toolkit';


const createAsyncReducer = <T, P, Arg>(
    thunk: AsyncThunk<P, Arg, any>,
    stateKey: string = 'list',
    stateLoading: string = 'isLoading',
    stateLoadMore: string = 'isLoadMore',
    stateRefreshing: string = 'isRefreshing',
) => (builder: any) => {
    builder
        .addCase(thunk.pending, (state: any) => {
            state[stateLoading] = true;
        })
        .addCase(thunk.fulfilled, (state: any, action: PayloadAction<P>) => {
            state[stateKey] = action.payload;
            state[stateLoading] = false;
            state[stateLoadMore] = false;
            state[stateRefreshing] = false;
        })
        .addCase(thunk.rejected, (state: any, action: PayloadAction<any>) => {
            state.error = action.payload;
            state[stateLoading] = false;
            state[stateLoadMore] = false;
            state[stateRefreshing] = false;

        });
};

export default createAsyncReducer;