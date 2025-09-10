import { Document, Model, Types } from "mongoose";

export type TStatus = "pending" | "approved" | "rejected";

export type TReview = {
  user?: Types.ObjectId;
  content: Types.ObjectId;
  type: "project" | "article";
  rating: number;
  review: string;
  status?: TStatus;
  is_edited?: boolean;
  edited_at?: Date;
  is_deleted?: boolean;
};

export interface TReviewDocument extends TReview, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TReviewDocument | null>;
}

export type TReviewModel = Model<TReviewDocument> & {
  isCommentExist(_id: string): Promise<TReviewDocument | null>;
};
