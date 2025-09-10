import { createAsyncThunk } from '@reduxjs/toolkit';
import { fetchArticlesStart, fetchArticlesSuccess, fetchArticleSuccess, fetchFeaturedArticlesSuccess, articleFailure } from './articleSlice';

// Fetch all articles
export const fetchArticles = createAsyncThunk(
  'articles/fetchArticles',
  async (params: { page?: number; limit?: number; category?: string } = {}, { dispatch }) => {
    try {
      dispatch(fetchArticlesStart());
      
      const { page = 1, limit = 10, category } = params;
      let url = `/api/articles?page=${page}&limit=${limit}`;
      
      if (category) {
        url += `&category=${category}`;
      }
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch articles');
      }
      
      dispatch(fetchArticlesSuccess(data.data));
      return data.data;
    } catch (error: any) {
      dispatch(articleFailure(error.message || 'Failed to fetch articles'));
      throw error;
    }
  }
);

// Fetch featured articles
export const fetchFeaturedArticles = createAsyncThunk(
  'articles/fetchFeaturedArticles',
  async (_, { dispatch }) => {
    try {
      dispatch(fetchArticlesStart());
      
      const response = await fetch('/api/articles?featured=true&limit=6');
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch featured articles');
      }
      
      dispatch(fetchFeaturedArticlesSuccess(data.data.articles));
      return data.data.articles;
    } catch (error: any) {
      dispatch(articleFailure(error.message || 'Failed to fetch featured articles'));
      throw error;
    }
  }
);

// Fetch single article by slug
export const fetchArticleBySlug = createAsyncThunk(
  'articles/fetchArticleBySlug',
  async (slug: string, { dispatch }) => {
    try {
      dispatch(fetchArticlesStart());
      
      const response = await fetch(`/api/articles/${slug}`);
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.message || 'Failed to fetch article');
      }
      
      dispatch(fetchArticleSuccess(data.data.article));
      return data.data.article;
    } catch (error: any) {
      dispatch(articleFailure(error.message || 'Failed to fetch article'));
      throw error;
    }
  }
);