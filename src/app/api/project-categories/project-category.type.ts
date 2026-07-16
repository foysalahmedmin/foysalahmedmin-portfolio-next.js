import type { Document, Model, Types } from "mongoose";

export type TProjectCategoryStatus = "active" | "inactive";

export type TProjectCategory = {
  sequence: number;
  icon?: string;
  name: string;
  slug: string;
  slug_history?: Array<{ slug: string; changed_at: Date | string }>;
  description?: string;
  status: TProjectCategoryStatus;
  tags: string[];
  parent?: Types.ObjectId | null;
  layout?: string;
  is_deleted?: boolean;
  deleted_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface TProjectCategoryDocument extends TProjectCategory, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TProjectCategoryDocument | null>;
}

export type TProjectCategoryModel = Model<TProjectCategoryDocument> & {
  isCategoryExist(_id: string): Promise<TProjectCategoryDocument | null>;
};
