import { createAsyncThunk } from "@reduxjs/toolkit";
import {
  categoryFailure,
  fetchArticleCategoriesSuccess,
  fetchArticleCategorySuccess,
  fetchCategoriesStart,
  fetchProjectCategoriesSuccess,
  fetchProjectCategorySuccess,
} from "./categorySlice";

const handleResponse = async (response: Response) => {
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.message || "Request failed");
  }

  return data.data;
};

export const fetchProjectCategories = createAsyncThunk(
  "categories/fetchProjectCategories",
  async (_, { dispatch }) => {
    try {
      dispatch(fetchCategoriesStart());

      const response = await fetch("/api/public/project-categories");
      const data = await handleResponse(response);

      dispatch(fetchProjectCategoriesSuccess(data.categories));
      return data.categories;
    } catch (error: any) {
      dispatch(
        categoryFailure(error?.message || "Failed to fetch project categories")
      );
      throw error;
    }
  }
);

export const fetchArticleCategories = createAsyncThunk(
  "categories/fetchArticleCategories",
  async (_, { dispatch }) => {
    try {
      dispatch(fetchCategoriesStart());

      const response = await fetch("/api/public/article-categories");
      const data = await handleResponse(response);

      dispatch(fetchArticleCategoriesSuccess(data.categories));
      return data.categories;
    } catch (error: any) {
      dispatch(
        categoryFailure(error?.message || "Failed to fetch article categories")
      );
      throw error;
    }
  }
);

export const fetchProjectCategoryBySlug = createAsyncThunk(
  "categories/fetchProjectCategoryBySlug",
  async (slug: string, { dispatch }) => {
    try {
      dispatch(fetchCategoriesStart());

      const response = await fetch(`/api/public/project-categories/${slug}`);
      const data = await handleResponse(response);

      dispatch(fetchProjectCategorySuccess(data.category));
      return data.category;
    } catch (error: any) {
      dispatch(
        categoryFailure(error?.message || "Failed to fetch project category")
      );
      throw error;
    }
  }
);

export const fetchArticleCategoryBySlug = createAsyncThunk(
  "categories/fetchArticleCategoryBySlug",
  async (slug: string, { dispatch }) => {
    try {
      dispatch(fetchCategoriesStart());

      const response = await fetch(`/api/public/article-categories/${slug}`);
      const data = await handleResponse(response);

      dispatch(fetchArticleCategorySuccess(data.category));
      return data.category;
    } catch (error: any) {
      dispatch(
        categoryFailure(error?.message || "Failed to fetch article category")
      );
      throw error;
    }
  }
);
