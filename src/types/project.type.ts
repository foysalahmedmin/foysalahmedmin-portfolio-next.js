import type { TFilePopulated } from "./file.type";
import type { PillarKey } from "@/lib/content/pillars";
import type {
  LinkVisibility,
  ProjectDeliveryStatus,
  ProjectOutcome,
  ProjectPublicationStatus,
  ProjectType,
} from "@/lib/content/portfolio-contract";
import type { RichContentDocument } from "@/lib/content/rich-content";

export type TProjectStatus =
  | "planned"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type TUserPopulated = {
  _id: string;
  name: string;
  email?: string;
  image?: TFilePopulated | null;
};

export type TProjectCategoryPopulated = {
  _id: string;
  name: string;
  slug: string;
};

export type TProject = {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  content: string;
  rich_content?: RichContentDocument;
  thumbnail?: TFilePopulated | null;
  images?: TFilePopulated[];
  tags?: string[];
  category?: TProjectCategoryPopulated | null;
  author?: TUserPopulated | null;
  collaborators?: TUserPopulated[];
  client?: TUserPopulated | null;
  primary_pillar?: PillarKey;
  secondary_pillars?: PillarKey[];
  delivery_status?: ProjectDeliveryStatus;
  publication_status?: ProjectPublicationStatus;
  project_type?: ProjectType;
  problem?: string;
  constraints?: string[];
  role?: string;
  architecture?: string;
  decisions?: string[];
  implementation?: string;
  security?: string;
  performance_reliability?: string;
  outcomes?: ProjectOutcome[];
  learnings?: string[];
  live_url?: string | null;
  live_url_visibility?: LinkVisibility;
  source_url?: string | null;
  source_url_visibility?: LinkVisibility;
  status: TProjectStatus;
  is_featured: boolean;
  is_premium: boolean;
  started_at?: string;
  ended_at?: string;
  layout?: string;
  created_at?: string;
  updated_at?: string;
};

export type TProjectListItem = Pick<
  TProject,
  | "_id"
  | "slug"
  | "name"
  | "description"
  | "thumbnail"
  | "tags"
  | "category"
  | "status"
  | "delivery_status"
  | "project_type"
  | "role"
  | "primary_pillar"
  | "secondary_pillars"
  | "outcomes"
  | "is_featured"
  | "is_premium"
  | "started_at"
>;

export type TProjectInput = {
  name?: string;
  slug?: string;
  description?: string;
  content?: string;
  thumbnail?: string | null;
  images?: string[];
  tags?: string[];
  category?: string;
  client?: string;
  collaborators?: string[];
  primary_pillar?: PillarKey;
  secondary_pillars?: PillarKey[];
  delivery_status?: ProjectDeliveryStatus;
  publication_status?: ProjectPublicationStatus;
  project_type?: ProjectType;
  problem?: string;
  constraints?: string[];
  role?: string;
  architecture?: string;
  decisions?: string[];
  implementation?: string;
  security?: string;
  performance_reliability?: string;
  outcomes?: ProjectOutcome[];
  learnings?: string[];
  live_url?: string | null;
  live_url_visibility?: LinkVisibility;
  source_url?: string | null;
  source_url_visibility?: LinkVisibility;
  status?: TProjectStatus;
  is_featured?: boolean;
  is_premium?: boolean;
  started_at?: string;
  ended_at?: string;
  layout?: string;
};

export type TProjectResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TProject;
};

export type TProjectsResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TProject[];
  meta?: {
    total: number;
    page: number;
    limit: number;
  };
};
