import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchCategoriesStart, fetchCategoriesSuccess, fetchCategorySuccess, categoryFailure } from './categorySlice';

// Fetch all categories
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (type?: string, { dispatch }) => {
    try {
      dispatch(fetchCategoriesStart());
      
      let url = '/api/categories';
      if (type) {
        url += `?type=${type}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch categories');
      }
      
      dispatch(fetchCategoriesSuccess(data.data.categories));
      return data.data.categories;
    } catch (error: any) {
      dispatch(categoryFailure(error.message || 'Failed to fetch categories'));
      throw error;
    }
  }
);

// Fetch single category by slug
export const fetchCategoryBySlug = createAsyncThunk(
  'categories/fetchCategoryBySlug',
  async (slug: string, { dispatch }) => {
    try {
      dispatch(fetchCategoriesStart());
      
      const response = await fetch(`/api/categories/${slug}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch category');
      }
      
      dispatch(fetchCategorySuccess(data.data.category));
      return data.data.category;
    } catch (error: any) {
      dispatch(categoryFailure(error.message || 'Failed to fetch category'));
      throw error;
    }
  }
);