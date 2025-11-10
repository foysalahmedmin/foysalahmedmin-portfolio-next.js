import { Document, Model, Types } from "mongoose";

export type TStatus = "draft" | "pending" | "published" | "archived";

type Ref = {
  _id: Types.ObjectId;
} & Record<string, any>;

export type TArticle = {
  name: string;
  slug: string;
  description?: string;
  content: string;
  thumbnail?: string;
  images?: string[];
  tags?: string[];
  category: Types.ObjectId | Ref;
  author: Types.ObjectId | Ref;
  collaborators?: (Types.ObjectId | Ref)[];
  status: TStatus;
  is_featured: boolean;
  is_premium: boolean;
  published_at?: Date;
  expired_at?: Date;
  layout?: string;
  is_deleted?: boolean;
};

export interface TArticleDocument extends TArticle, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TArticleDocument | null>;
}

export type TArticleModel = Model<TArticleDocument> & {
  isArticleExist(_id: string): Promise<TArticleDocument | null>;
};
