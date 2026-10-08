import type { Document, Model, Types } from "mongoose";

export type TVideoCategoryStatus = "active" | "inactive";

export type TVideoCategory = {
  sequence: number;
  icon?: string;
  name: string;
  slug: string;
  slug_history?: Array<{ slug: string; changed_at: Date | string }>;
  description?: string;
  status: TVideoCategoryStatus;
  tags: string[];
  parent?: Types.ObjectId | null;
  layout?: string;
  is_deleted?: boolean;
  deleted_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface TVideoCategoryDocument extends TVideoCategory, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TVideoCategoryDocument | null>;
}

export type TVideoCategoryModel = Model<TVideoCategoryDocument> & {
  isCategoryExist(_id: string): Promise<TVideoCategoryDocument | null>;
};
