import { Document, Model, Types } from 'mongoose';

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
  thumbnail?: string;
  images?: string[];
  tags?: string[];
  category: Types.ObjectId;
  author: Types.ObjectId;
  collaborators?: Types.ObjectId[];
  client?: Types.ObjectId;
  status: TStatus;
  is_featured: boolean;
  is_premium: boolean;
  started_at?: Date;
  ended_at?: Date;
  layout?: string;
  is_deleted?: boolean;
};

export interface TProjectDocument extends TProject, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TProjectDocument | null>;
}

export type TProjectModel = Model<TProjectDocument> & {
  isProjectExist(_id: string): Promise<TProjectDocument | null>;
};

