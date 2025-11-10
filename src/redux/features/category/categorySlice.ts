import { TArticleCategory } from "@/types/article-category.type";
import { TProjectCategory } from "@/types/project-category.type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface CategoryState {
  projectCategories: TProjectCategory[];
  projectCategory: TProjectCategory | null;
  articleCategories: TArticleCategory[];
  articleCategory: TArticleCategory | null;
  loading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  projectCategories: [],
  projectCategory: null,
  articleCategories: [],
  articleCategory: null,
  loading: false,
  error: null,
};

const categorySlice = createSlice({
  name: "category",
  initialState,
  reducers: {
    fetchCategoriesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchProjectCategoriesSuccess: (
      state,
      action: PayloadAction<TProjectCategory[]>
    ) => {
      state.loading = false;
      state.projectCategories = action.payload;
      state.error = null;
    },
    fetchArticleCategoriesSuccess: (
      state,
      action: PayloadAction<TArticleCategory[]>
    ) => {
      state.loading = false;
      state.articleCategories = action.payload;
      state.error = null;
    },
    fetchProjectCategorySuccess: (
      state,
      action: PayloadAction<TProjectCategory>
    ) => {
      state.loading = false;
      state.projectCategory = action.payload;
      state.error = null;
    },
    fetchArticleCategorySuccess: (
      state,
      action: PayloadAction<TArticleCategory>
    ) => {
      state.loading = false;
      state.articleCategory = action.payload;
      state.error = null;
    },
    categoryFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
      state.error = action.payload;
    },
    clearCategoryError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchCategoriesStart,
  fetchProjectCategoriesSuccess,
  fetchArticleCategoriesSuccess,
  fetchProjectCategorySuccess,
  fetchArticleCategorySuccess,
  categoryFailure,
  clearCategoryError,
} = categorySlice.actions;

export default categorySlice.reducer;
