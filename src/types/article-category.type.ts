import { Document, Model, Types } from "mongoose";

export type TArticleCategoryStatus = "active" | "inactive";

export type TArticleCategorySEO = {
  title?: string;
  description?: string;
  keywords?: string[];
};

export type TArticleCategory = {
  sequence: number;
  icon?: string;
  thumbnail?: string;
  name: string;
  slug: string;
  description?: string;
  status: TArticleCategoryStatus;
  tags: string[];
  parent?: Types.ObjectId | null;
  layout?: string;
  seo?: TArticleCategorySEO;
  is_deleted?: boolean;
};

export type TArticleCategoryTree = TArticleCategory & {
  _id: string;
  children?: TArticleCategoryTree[];
};

export interface TArticleCategoryDocument
  extends TArticleCategory,
    Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TArticleCategoryDocument | null>;
}

export type TArticleCategoryModel = Model<TArticleCategoryDocument> & {
  isCategoryExist(_id: string): Promise<TArticleCategoryDocument | null>;
};

