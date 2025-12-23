import type { TSettingState } from "@/types/state.type";
import type { PayloadAction } from "@reduxjs/toolkit";
import { createSlice } from "@reduxjs/toolkit";

const LOCAL_STORAGE_KEY = "setting";

const defaultSetting : TSettingState = {
  theme: "system",
  direction: "ltr",
  language: "en",
};

const getInitialSetting = () : TSettingState => {
  try {
    if (typeof window === "undefined") {
      return defaultSetting;
    }

    const setting = localStorage.getItem(LOCAL_STORAGE_KEY);
    return setting ? JSON.parse(setting) : defaultSetting;
  } catch (error) {
    console.error("Error parsing setting from localStorage", error);
    return defaultSetting;
  }
};

const initialState = getInitialSetting();

const saveState = (state: TSettingState) : void => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
};

const settingSlice = createSlice({
  name: "setting",
  initialState: initialState,
  reducers: {
    // Setting
    setSetting(state, action: PayloadAction<TSettingState>) : void {
      state = action.payload;
      saveState(state);
    },
    clearSetting(state) {
      localStorage.removeItem(LOCAL_STORAGE_KEY);
      state = initialState;
    },

    // Theme
    setTheme(state, action: PayloadAction<TSettingState["theme"]>) {
      state.theme = action.payload;
      saveState(state);
    },
    toggleTheme(state) : void {
      const order = ["light", "dark", "system"];
      const nextIndex = (order.indexOf(state.theme ?? "") + 1) % order.length;
      state.theme = order[nextIndex] as TSettingState["theme"];
      saveState(state);
    },

    // Language
    setLanguage(state, action: PayloadAction<TSettingState["language"]>) {
      state.language = action.payload;
      saveState(state);
    },
    toggleLanguage(state) : void {
      state.language = state.language === "en" ? "bn" : "en" as TSettingState["language"];
      saveState(state);
    },

    // Direction
    setDirection(state, action: PayloadAction<TSettingState["direction"]>) {
      state.direction = action.payload;
      saveState(state);
    },
    toggleDirection(state) : void {
      state.direction = state.direction === "ltr" ? "rtl" : "ltr" as TSettingState["direction"];
      saveState(state);
    },
  },
});

export const {
  // Setting
  setSetting,
  clearSetting,

  // Theme
  setTheme,
  toggleTheme,

  // Language
  setLanguage,
  toggleLanguage,

  // Direction
  setDirection,
  toggleDirection,
} = settingSlice.actions;

export default settingSlice.reducer;
