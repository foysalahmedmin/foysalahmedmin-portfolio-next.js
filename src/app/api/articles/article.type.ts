import type { Document, Model, Types } from 'mongoose';

export type TStatus = 'draft' | 'pending' | 'published' | 'archived';

export type TArticle = {
  name: string;
  description?: string;
  content: string;
  thumbnail?: Types.ObjectId | null;
  images?: Types.ObjectId[];
  tags?: string[];
  category: Types.ObjectId;
  author: Types.ObjectId;
  collaborators?: Types.ObjectId[];
  status: TStatus;
  is_featured: boolean;
  is_premium: boolean;
  published_at?: Date | string;
  expired_at?: Date | string;
  layout?: string;
  is_deleted?: boolean;
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

