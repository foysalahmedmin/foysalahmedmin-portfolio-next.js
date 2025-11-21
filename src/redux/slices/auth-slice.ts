import type { TUserState } from "@/types/state.type";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

const getInitialUser = (): TUserState => {
  try {
    const user = localStorage.getItem("user");
    return user ? JSON.parse(user) : { is_authenticated: false };
  } catch (error) {
    console.error("Error parsing user from localStorage", error);
    return { is_authenticated: false };
  }
};

const initialState: TUserState = getInitialUser();

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setUser: (state, action: PayloadAction<TUserState>) => {
      const user = action.payload;
      if (user?.token) {
        localStorage.setItem(
          "user",
          JSON.stringify({ ...user, is_authenticated: true }),
        );
        return { ...user, is_authenticated: true };
      }
      return state;
    },
    clearUser: () => {
      localStorage.removeItem("user");
      return { is_authenticated: false };
    },
  },
});

export const { setUser, clearUser } = userSlice.actions;
export default userSlice.reducer;
