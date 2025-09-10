import mongoose, { Document, Model, Types } from "mongoose";

export type TStatus = "active" | "inactive";

export type TCategory = {
  sequence: number;
  icon?: string;
  thumbnail?: string;
  name: string;
  slug: string;
  description?: string;
  status: TStatus;
  tags: string[];
  category?: mongoose.Types.ObjectId | null;
  layout?: string;
  seo?: {
    title?: string;
    description?: string;
    keywords?: string[];
  };
  is_deleted?: boolean;
};

export type TCategoryTree = TCategory & {
  _id: string;
  children?: TCategoryTree[];
};

export interface TCategoryDocument extends TCategory, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TCategoryDocument | null>;
}

export type TCategoryModel = Model<TCategoryDocument> & {
  isCategoryExist(_id: string): Promise<TCategoryDocument | null>;
};
