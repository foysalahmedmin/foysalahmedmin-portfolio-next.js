import { TCategory } from "@/types/category.type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CategoryState {
  categories: TCategory[];
  category: TCategory | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  categories: [],
  category: null,
  isLoading: false,
  error: null,
};

const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {
    fetchCategoriesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchCategoriesSuccess: (state, action: PayloadAction<TCategory[]>) => {
      state.isLoading = false;
      state.categories = action.payload;
      state.error = null;
    },
    fetchCategorySuccess: (state, action: PayloadAction<TCategory>) => {
      state.isLoading = false;
      state.category = action.payload;
      state.error = null;
    },
    categoryFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    clearCategoryError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchCategoriesStart,
  fetchCategoriesSuccess,
  fetchCategorySuccess,
  categoryFailure,
  clearCategoryError,
} = categorySlice.actions;

export default categorySlice.reducer;