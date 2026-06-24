import { TypedUseSelectorHook, useSelector, useDispatch } from "react-redux";
import { AppDispatch } from ".";
import type { RootState } from './index';

// A custom hook that provides the correct typed dispatch
export const useAppDispatch = () => useDispatch<AppDispatch>();

export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;
