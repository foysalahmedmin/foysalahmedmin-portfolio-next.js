import { createSlice } from "@reduxjs/toolkit";

const LOCAL_STORAGE_KEY = "settings";

const defaultSettings = {
  theme: "system",
  direction: "ltr",
  language: "en",
};

const getInitialSetting = () => {
  try {
    if (typeof window === "undefined") {
      return defaultSettings;
    }

    const setting = localStorage.getItem(LOCAL_STORAGE_KEY);
    return setting ? JSON.parse(setting) : defaultSettings;
  } catch (error) {
    console.error("Error parsing setting from localStorage", error);
    return defaultSettings;
  }
};

const initialState = getInitialSetting();

const saveState = (state) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
};

const settingsSlice = createSlice({
  name: "settings",
  initialState: initialState,
  reducers: {
    updateTheme(state, action) {
      state.theme = action.payload;
      saveState(state);
    },
    toggleTheme(state) {
      const order = ["light", "dark", "system"];
      const nextIndex = (order.indexOf(state.theme) + 1) % order.length;
      state.theme = order[nextIndex];
      saveState(state);
    },

    updateSidebar(state, action) {
      state.sidebar = action.payload;
      saveState(state);
    },
    toggleSidebar(state) {
      state.sidebar = state.sidebar === "expanded" ? "compact" : "expanded";
      saveState(state);
    },

    updateHeader(state, action) {
      state.header = action.payload;
      saveState(state);
    },
    toggleHeader(state) {
      state.header = state.header === "expanded" ? "compact" : "expanded";
      saveState(state);
    },

    updateLanguage(state, action) {
      state.language = action.payload;
      saveState(state);
    },
    toggleLanguage(state) {
      state.language = state.language === "en" ? "bn" : "en";
      saveState(state);
    },
    updateDirection(state, action) {
      state.direction = action.payload;
      saveState(state);
    },
    toggleDirection(state) {
      state.direction = state.direction === "ltr" ? "rtl" : "ltr";
      saveState(state);
    },


  },
});

export const {
  updateTheme,
  toggleTheme,
  updateLanguage,
  toggleLanguage,
  updateDirection,
  toggleDirection,
} = settingsSlice.actions;

export default settingsSlice.reducer;
