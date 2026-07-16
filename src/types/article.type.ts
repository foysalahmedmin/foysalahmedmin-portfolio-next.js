import type { TFilePopulated } from "./file.type";
import type { PillarKey } from "@/lib/content/pillars";
import type { ArticleBodyMetadata } from "@/lib/content/portfolio-contract";
import type { RichContentDocument } from "@/lib/content/rich-content";

export type TArticleStatus = "draft" | "pending" | "published" | "archived";

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
  slug?: string;
  description?: string;
  excerpt?: string;
  content: string;
  rich_content?: RichContentDocument;
  thumbnail?: TFilePopulated | null;
  images?: TFilePopulated[];
  tags?: string[];
  category?: TArticleCategoryPopulated | null;
  author?: TUserPopulated | null;
  collaborators?: TUserPopulated[];
  primary_pillar?: PillarKey;
  secondary_pillars?: PillarKey[];
  topics?: string[];
  reading_time_minutes?: number;
  reading_time_source?: "derived" | "manual";
  body_metadata?: ArticleBodyMetadata;
  status: TArticleStatus;
  is_featured: boolean;
  is_premium: boolean;
  published_at?: string;
  expired_at?: string | null;
  layout?: string;
  created_at?: string;
  updated_at?: string;
};

export type TPublicArticle = Omit<TArticle, "status">;

export type TArticleListItem = Pick<
  TArticle,
  | "_id"
  | "slug"
  | "name"
  | "description"
  | "excerpt"
  | "thumbnail"
  | "tags"
  | "category"
  | "author"
  | "primary_pillar"
  | "secondary_pillars"
  | "topics"
  | "reading_time_minutes"
  | "reading_time_source"
  | "is_featured"
  | "is_premium"
  | "published_at"
  | "updated_at"
>;

export type TArticleInput = {
  name?: string;
  slug?: string;
  description?: string;
  excerpt?: string;
  content?: string;
  thumbnail?: string | null;
  images?: string[];
  tags?: string[];
  category?: string;
  collaborators?: string[];
  primary_pillar?: PillarKey;
  secondary_pillars?: PillarKey[];
  topics?: string[];
  reading_time_minutes?: number;
  reading_time_source?: "derived" | "manual";
  status?: TArticleStatus;
  is_featured?: boolean;
  is_premium?: boolean;
  published_at?: string;
  expired_at?: string | null;
  layout?: string;
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
