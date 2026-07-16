import type { Document, Model, Types } from "mongoose";

export type TArticleCategoryStatus = "active" | "inactive";

export type TArticleCategory = {
  sequence: number;
  icon?: string;
  name: string;
  slug: string;
  slug_history?: Array<{ slug: string; changed_at: Date | string }>;
  description?: string;
  status: TArticleCategoryStatus;
  tags: string[];
  parent?: Types.ObjectId | null;
  layout?: string;
  is_deleted?: boolean;
  deleted_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface TArticleCategoryDocument extends TArticleCategory, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TArticleCategoryDocument | null>;
}

export type TArticleCategoryModel = Model<TArticleCategoryDocument> & {
  isCategoryExist(_id: string): Promise<TArticleCategoryDocument | null>;
};
