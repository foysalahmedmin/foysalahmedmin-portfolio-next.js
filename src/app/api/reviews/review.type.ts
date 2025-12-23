import type { Document, Model, Types } from "mongoose";

export type TStatus = "pending" | "approved" | "rejected";

export type TReview = {
  author?: Types.ObjectId;
  target: Types.ObjectId;
  target_model: "Project" | "Article";
  rating: number;
  review: string;
  status?: TStatus;
  is_edited?: boolean;
  edited_at?: Date;
  is_deleted?: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface TReviewDocument extends TReview, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TReviewDocument | null>;
}

export type TReviewModel = Model<TReviewDocument> & {
  isReviewExist(_id: string): Promise<TReviewDocument | null>;
};
