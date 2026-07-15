import type { TFilePopulated } from './file.type';

export type TArticleStatus = 'draft' | 'pending' | 'published' | 'archived';

export type TUserPopulated = {
  _id: string;
  name: string;
  email?: string;
  image?: TFilePopulated | null;
};

export type TArticleCategoryPopulated = {
  _id: string;
  name: string;
  slug: string;
};

export type TArticle = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  content: string;
  thumbnail?: TFilePopulated | null;
  images?: TFilePopulated[];
  tags?: string[];
  category: TArticleCategoryPopulated;
  author: TUserPopulated;
  collaborators?: TUserPopulated[];
  status: TArticleStatus;
  is_featured: boolean;
  is_premium: boolean;
  published_at?: string;
  expired_at?: string;
  layout?: string;
  created_at?: string;
  updated_at?: string;
};

export type TArticleResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TArticle;
};

export type TArticlesResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TArticle[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};
