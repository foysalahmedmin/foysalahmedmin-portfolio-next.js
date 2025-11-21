import { Document, Model, Types } from "mongoose";
import { TProject } from "./project.type";

export type TStatus = "pending" | "approved" | "rejected";

export type TUserPopulated = {
  _id: string;
  name: string;
  email: string;
  image?: string;
};

export type TProjectPopulated = {
  _id: string;
  name: string;
};

export type TArticlePopulated = {
  _id: string;
  name: string;
};

export type TReview = {
  author?: TUserPopulated;
  target?: TProjectPopulated | TArticlePopulated;
  target_model: "Project" | "Article";
  rating: number;
  review: string;
  status?: TStatus;
  is_edited?: boolean;
  edited_at?: Date;
  is_deleted?: boolean;
};

export type TReviewResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TReview;
};

export type TReviewsResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TReview[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};