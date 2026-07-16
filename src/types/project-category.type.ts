// Frontend types with populated data (for API responses)

export type TProjectCategoryStatus = "active" | "inactive";

export type TProjectCategoryPopulated = {
  _id: string;
  name: string;
  slug?: string;
};

export type TProjectCategory = {
  _id: string;
  sequence: number;
  icon?: string;
  name: string;
  slug: string;
  slug_history?: Array<{ slug: string; changed_at: string }>;
  description?: string;
  status?: TProjectCategoryStatus;
  tags: string[];
  parent?: TProjectCategoryPopulated | null;
  layout?: string;
  created_at?: string;
  updated_at?: string;
};

export type TProjectCategoryTree = TProjectCategory & {
  children?: TProjectCategoryTree[];
};

export type TProjectCategoryResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TProjectCategory;
};

export type TProjectCategoriesResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TProjectCategory[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};
