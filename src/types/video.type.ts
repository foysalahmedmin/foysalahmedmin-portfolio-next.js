import type {
  VideoAspectRatio,
  VideoSourceType,
} from "@/lib/content/video-contract";
import type { TFilePopulated } from "./file.type";

export type TVideoStatus = "draft" | "pending" | "published" | "archived";

export type TVideoCategoryRef = {
  _id: string;
  name: string;
  slug: string;
};

export type TVideoAuthor = {
  _id: string;
  name: string;
  email?: string;
};

export type TVideo = {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  keywords?: string[];
  thumbnail?: TFilePopulated | null;
  category?: TVideoCategoryRef | null;
  author?: TVideoAuthor | null;
  aspect_ratio: VideoAspectRatio;
  source_type: VideoSourceType;
  video_file?: TFilePopulated | null;
  youtube_url?: string | null;
  youtube_id?: string | null;
  duration_seconds?: number;
  status: TVideoStatus;
  is_featured: boolean;
  published_at?: string;
  expired_at?: string | null;
  layout?: string;
  created_at?: string;
  updated_at?: string;
};

export type TPublicVideo = Omit<TVideo, "status">;

export type TVideoListItem = Pick<
  TVideo,
  | "_id"
  | "slug"
  | "name"
  | "description"
  | "keywords"
  | "thumbnail"
  | "category"
  | "aspect_ratio"
  | "source_type"
  | "video_file"
  | "youtube_url"
  | "youtube_id"
  | "duration_seconds"
  | "is_featured"
  | "published_at"
  | "updated_at"
>;

export type TVideoInput = {
  name?: string;
  slug?: string;
  description?: string;
  keywords?: string[];
  thumbnail?: string | null;
  category?: string;
  aspect_ratio?: VideoAspectRatio;
  source_type?: VideoSourceType;
  video_file?: string | null;
  youtube_url?: string | null;
  duration_seconds?: number | null;
  status?: TVideoStatus;
  is_featured?: boolean;
  published_at?: string;
  expired_at?: string | null;
  layout?: string;
};
