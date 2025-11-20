import { Document, Model, Types } from 'mongoose';

export type TProjectCategoryStatus = 'active' | 'inactive';

export type TProjectCategorySEO = {
  title?: string;
  description?: string;
  keywords?: string[];
};

export type TProjectCategory = {
  sequence: number;
  icon?: string;
  thumbnail?: string;
  name: string;
  slug: string;
  description?: string;
  status: TProjectCategoryStatus;
  tags: string[];
  parent?: Types.ObjectId | null;
  layout?: string;
  seo?: TProjectCategorySEO;
  is_deleted?: boolean;
};

export interface TProjectCategoryDocument
  extends TProjectCategory,
    Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TProjectCategoryDocument | null>;
}

export type TProjectCategoryModel = Model<TProjectCategoryDocument> & {
  isCategoryExist(_id: string): Promise<TProjectCategoryDocument | null>;
};

