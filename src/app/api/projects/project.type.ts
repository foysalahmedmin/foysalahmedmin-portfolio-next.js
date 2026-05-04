import type { Document, Model, Types } from 'mongoose';

export type TStatus =
  | 'planned'
  | 'in_progress'
  | 'on_hold'
  | 'completed'
  | 'cancelled';

export type TProject = {
  name: string;
  description?: string;
  content: string;
  thumbnail?: Types.ObjectId | null;
  images?: Types.ObjectId[];
  tags?: string[];
  category: Types.ObjectId;
  author: Types.ObjectId;
  collaborators?: Types.ObjectId[];
  client?: Types.ObjectId;
  status: TStatus;
  is_featured: boolean;
  is_premium: boolean;
  started_at?: Date | string;
  ended_at?: Date | string;
  layout?: string;
  is_deleted?: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface TProjectDocument extends TProject, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TProjectDocument | null>;
}

export type TProjectModel = Model<TProjectDocument> & {
  isProjectExist(_id: string): Promise<TProjectDocument | null>;
};

