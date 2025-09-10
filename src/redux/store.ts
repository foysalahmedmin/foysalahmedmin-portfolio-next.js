import { configureStore } from "@reduxjs/toolkit";
import authReducer from "./features/auth/authSlice";
import projectReducer from "./features/project/projectSlice";
import articleReducer from "./features/article/articleSlice";
import categoryReducer from "./features/category/categorySlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    project: projectReducer,
    article: articleReducer,
    category: categoryReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;
