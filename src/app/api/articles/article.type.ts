import type { Document, Model, Types } from "mongoose";
import type { RichContentDocument } from "@/lib/content/rich-content";
import type { PillarKey } from "@/lib/content/pillars";
import type { ArticleBodyMetadata } from "@/lib/content/portfolio-contract";

export type TStatus = "draft" | "pending" | "published" | "archived";

export type TArticle = {
  name: string;
  slug?: string;
  slug_history?: Array<{ slug: string; changed_at: Date | string }>;
  description?: string;
  excerpt?: string;
  content: string;
  rich_content?: RichContentDocument;
  thumbnail?: Types.ObjectId | null;
  images?: Types.ObjectId[];
  tags?: string[];
  category: Types.ObjectId;
  author: Types.ObjectId;
  collaborators?: Types.ObjectId[];
  primary_pillar?: PillarKey;
  secondary_pillars?: PillarKey[];
  topics?: string[];
  reading_time_minutes?: number;
  reading_time_source?: "derived" | "manual";
  body_metadata?: ArticleBodyMetadata;
  status: TStatus;
  is_featured: boolean;
  is_premium: boolean;
  published_at?: Date | string;
  expired_at?: Date | string | null;
  layout?: string;
  is_deleted?: boolean;
  deleted_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface TArticleDocument extends TArticle, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TArticleDocument | null>;
}

export type TArticleModel = Model<TArticleDocument> & {
  isArticleExist(_id: string): Promise<TArticleDocument | null>;
};
