import type { Document, Model, Types } from "mongoose";

export type TCaseStudyCategoryStatus = "active" | "inactive";

export type TCaseStudyCategory = {
  sequence: number;
  icon?: string;
  name: string;
  slug: string;
  slug_history?: Array<{ slug: string; changed_at: Date | string }>;
  description?: string;
  status: TCaseStudyCategoryStatus;
  tags: string[];
  parent?: Types.ObjectId | null;
  layout?: string;
  is_deleted?: boolean;
  deleted_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface TCaseStudyCategoryDocument extends TCaseStudyCategory, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TCaseStudyCategoryDocument | null>;
}

export type TCaseStudyCategoryModel = Model<TCaseStudyCategoryDocument> & {
  isCategoryExist(_id: string): Promise<TCaseStudyCategoryDocument | null>;
};
