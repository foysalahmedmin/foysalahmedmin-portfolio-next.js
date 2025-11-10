import { Document, Model, Types } from "mongoose";

export type TStatus =
  | "planned"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

type Ref<T extends string = string> = {
  _id: Types.ObjectId;
} & Record<string, any>;

export type TProject = {
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
  client?: Types.ObjectId | Ref;
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
