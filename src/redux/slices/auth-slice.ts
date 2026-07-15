import type { TAuthState } from "@/types/state.type";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

const LOCAL_STORAGE_KEY = "auth";

const getInitialAuth = (): TAuthState => {
  if (typeof window === "undefined") {
    return { is_authenticated: false };
  }

  try {
    const auth = localStorage.getItem(LOCAL_STORAGE_KEY);
    return auth ? JSON.parse(auth) : { is_authenticated: false };
  } catch (error) {
    console.error("Error parsing user from localStorage", error);
    return { is_authenticated: false };
  }
};

const initialState: TAuthState = getInitialAuth();

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action: PayloadAction<TAuthState>) => {
      const auth = action.payload;
      if (auth?.is_authenticated && auth.info) {
        if (typeof window !== "undefined") {
          localStorage.setItem(
            LOCAL_STORAGE_KEY,
            JSON.stringify({ ...auth, is_authenticated: true }),
          );
        }
        return { ...auth, is_authenticated: true };
      }
      return state;
    },
    clearAuth: () => {
      if (typeof window !== "undefined") {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
      }
      return { is_authenticated: false };
    },
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;
