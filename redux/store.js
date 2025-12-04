import { configureStore } from "@reduxjs/toolkit";
import { authApi } from "./api/authApi";
import { blogApi } from "./api/blogApi";


export const store = configureStore({
    reducer: {
        [authApi.reducerPath]: authApi.reducer,[blogApi.reducerPath]: blogApi.reducer,
    },
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(authApi.middleware,blogApi.middleware),
});