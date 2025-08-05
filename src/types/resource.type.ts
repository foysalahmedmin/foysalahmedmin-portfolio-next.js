import { Document, Model, Types } from "mongoose";

export type TResource = {
  project: Types.ObjectId;
  sequence: number;
  type: "repository" | "design" | "documentation" | "other";
  title: string;
  url: string;
  description?: string;
  is_private: boolean;
  is_deleted?: boolean;
};

export interface TResourceDocument extends TResource, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TResourceDocument | null>;
}

export type TResourceModel = Model<TResourceDocument> & {
  isResourceExist(_id: string): Promise<TResourceDocument | null>;
};
