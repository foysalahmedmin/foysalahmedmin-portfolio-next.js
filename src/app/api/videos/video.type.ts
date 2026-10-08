import type { Document, Model, Types } from "mongoose";
import type {
  VideoAspectRatio,
  VideoSourceType,
} from "@/lib/content/video-contract";

export type TStatus = "draft" | "pending" | "published" | "archived";

export type TVideo = {
  name: string;
  slug?: string;
  slug_history?: Array<{ slug: string; changed_at: Date | string }>;
  description?: string;
  keywords?: string[];
  thumbnail?: Types.ObjectId | null;
  category: Types.ObjectId;
  author: Types.ObjectId;
  aspect_ratio: VideoAspectRatio;
  source_type: VideoSourceType;
  video_file?: Types.ObjectId | null;
  youtube_url?: string | null;
  youtube_id?: string | null;
  duration_seconds?: number;
  status: TStatus;
  is_featured: boolean;
  published_at?: Date | string;
  expired_at?: Date | string | null;
  layout?: string;
  is_deleted?: boolean;
  deleted_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface TVideoDocument extends TVideo, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TVideoDocument | null>;
}

export type TVideoModel = Model<TVideoDocument> & {
  isVideoExist(_id: string): Promise<TVideoDocument | null>;
};
