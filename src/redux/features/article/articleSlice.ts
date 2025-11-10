import { TArticle } from "@/types/article.type";
import { createSlice, PayloadAction } from "@reduxjs/toolkit";

type Pagination = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

interface ArticleState {
  articles: TArticle[];
  article: TArticle | null;
  featuredArticles: TArticle[];
  pagination: Pagination | null;
  loading: boolean;
  error: string | null;
}

const initialState: ArticleState = {
  articles: [],
  article: null,
  featuredArticles: [],
  pagination: null,
  loading: false,
  error: null,
};

const articleSlice = createSlice({
  name: "article",
  initialState,
  reducers: {
    fetchArticlesStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    fetchArticlesSuccess: (
      state,
      action: PayloadAction<{ articles: TArticle[]; pagination: Pagination }>
    ) => {
      state.loading = false;
      state.articles = action.payload.articles;
      state.pagination = action.payload.pagination;
      state.error = null;
    },
    fetchArticleSuccess: (state, action: PayloadAction<TArticle>) => {
      state.loading = false;
      state.article = action.payload;
      state.error = null;
    },
    fetchFeaturedArticlesSuccess: (state, action: PayloadAction<TArticle[]>) => {
      state.loading = false;
      state.featuredArticles = action.payload;
      state.error = null;
    },
    articleFailure: (state, action: PayloadAction<string>) => {
      state.loading = false;
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