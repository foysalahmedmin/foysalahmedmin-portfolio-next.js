import type { Document, Model, Types } from "mongoose";
import type { RichContentDocument } from "@/lib/content/rich-content";
import type { PillarKey } from "@/lib/content/pillars";
import type {
  LinkVisibility,
  ProjectDeliveryStatus,
  ProjectOutcome,
  ProjectPublicationStatus,
  ProjectType,
} from "@/lib/content/portfolio-contract";

export type TStatus =
  | "planned"
  | "in_progress"
  | "on_hold"
  | "completed"
  | "cancelled";

export type TProject = {
  name: string;
  slug?: string;
  slug_history?: Array<{ slug: string; changed_at: Date | string }>;
  description?: string;
  content: string;
  rich_content?: RichContentDocument;
  thumbnail?: Types.ObjectId | null;
  images?: Types.ObjectId[];
  tags?: string[];
  category: Types.ObjectId;
  author: Types.ObjectId;
  collaborators?: Types.ObjectId[];
  client?: Types.ObjectId;
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
  /** Legacy delivery state retained during the staged migration. */
  status: TStatus;
  is_featured: boolean;
  is_premium: boolean;
  started_at?: Date | string;
  ended_at?: Date | string;
  layout?: string;
  is_deleted?: boolean;
  deleted_at?: Date | string | null;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface TProjectDocument extends TProject, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TProjectDocument | null>;
}

export type TProjectModel = Model<TProjectDocument> & {
  isProjectExist(_id: string): Promise<TProjectDocument | null>;
};
