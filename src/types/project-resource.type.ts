import { Document, Model, Types } from "mongoose";

export type TProjectResourceType =
  | "repository"
  | "design"
  | "documentation"
  | "other";

export type TProjectResource = {
  project: Types.ObjectId;
  sequence: number;
  type: TProjectResourceType;
  title: string;
  url: string;
  description?: string;
  is_private: boolean;
  is_deleted?: boolean;
};

export interface TProjectResourceDocument
  extends TProjectResource,
    Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TProjectResourceDocument | null>;
}

export type TProjectResourceModel = Model<TProjectResourceDocument> & {
  isResourceExist(_id: string): Promise<TProjectResourceDocument | null>;
};

