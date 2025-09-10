import { TArticle } from "@/types/article.type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface ArticleState {
  articles: TArticle[];
  article: TArticle | null;
  featuredArticles: TArticle[];
  isLoading: boolean;
  error: string | null;
}

const initialState: ArticleState = {
  articles: [],
  article: null,
  featuredArticles: [],
  isLoading: false,
  error: null,
};

const articleSlice = createSlice({
  name: "article",
  initialState,
  reducers: {
    fetchArticlesStart: (state) => {
      state.isLoading = true;
      state.error = null;
    },
    fetchArticlesSuccess: (state, action: PayloadAction<TArticle[]>) => {
      state.isLoading = false;
      state.articles = action.payload;
      state.error = null;
    },
    fetchArticleSuccess: (state, action: PayloadAction<TArticle>) => {
      state.isLoading = false;
      state.article = action.payload;
      state.error = null;
    },
    fetchFeaturedArticlesSuccess: (state, action: PayloadAction<TArticle[]>) => {
      state.isLoading = false;
      state.featuredArticles = action.payload;
      state.error = null;
    },
    articleFailure: (state, action: PayloadAction<string>) => {
      state.isLoading = false;
      state.error = action.payload;
    },
    clearArticleError: (state) => {
      state.error = null;
    },
  },
});

export const {
  fetchArticlesStart,
  fetchArticlesSuccess,
  fetchArticleSuccess,
  fetchFeaturedArticlesSuccess,
  articleFailure,
  clearArticleError,
} = articleSlice.actions;

export default articleSlice.reducer;