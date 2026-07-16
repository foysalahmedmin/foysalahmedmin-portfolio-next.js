// Frontend types with populated data (for API responses)

export type TArticleCategoryStatus = "active" | "inactive";

export type TArticleCategoryPopulated = {
  _id: string;
  name: string;
  slug?: string;
};

export type TArticleCategory = {
  _id: string;
  sequence: number;
  icon?: string;
  name: string;
  slug: string;
  slug_history?: Array<{ slug: string; changed_at: string }>;
  description?: string;
  status?: TArticleCategoryStatus;
  tags: string[];
  parent?: TArticleCategoryPopulated | null;
  layout?: string;
  created_at?: string;
  updated_at?: string;
};

export type TArticleCategoryTree = TArticleCategory & {
  children?: TArticleCategoryTree[];
};

export type TArticleCategoryResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TArticleCategory;
};

export type TArticleCategoriesResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TArticleCategory[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};
