import type { Document, Model, Types } from "mongoose";
import type { PillarKey } from "@/lib/content/pillars";
import type { RichContentDocument } from "@/lib/content/rich-content";
import type {
  CaseStudyLinkVisibility,
  CaseStudyOutcome,
} from "@/lib/content/case-study-contract";
import type { ProjectType } from "@/lib/content/portfolio-contract";

export type TStatus = "draft" | "pending" | "published" | "archived";

export type TCaseStudy = {
  name: string;
  slug?: string;
  slug_history?: Array<{ slug: string; changed_at: Date | string }>;
  description?: string;
  overview?: string;
  content?: string;
  rich_content?: RichContentDocument;
  thumbnail?: Types.ObjectId | null;
  images?: Types.ObjectId[];
  category: Types.ObjectId;
  author: Types.ObjectId;
  client_name?: string;
  show_client_name?: boolean;
  client_industry?: string;
  client_location?: string;
  engagement_type?: ProjectType;
  primary_pillar?: PillarKey;
  secondary_pillars?: PillarKey[];
  role?: string;
  team_size?: number;
  duration_label?: string;
  started_at?: Date | string;
  ended_at?: Date | string;
  challenge?: string;
  approach?: string;
  solution?: string;
  key_decisions?: string[];
  results_summary?: string;
  outcomes?: CaseStudyOutcome[];
  tech_stack?: string[];
  services?: string[];
  learnings?: string[];
  keywords?: string[];
  live_url?: string | null;
  live_url_visibility?: CaseStudyLinkVisibility;
  source_url?: string | null;
  source_url_visibility?: CaseStudyLinkVisibility;
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

export interface TCaseStudyDocument extends TCaseStudy, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TCaseStudyDocument | null>;
}

export type TCaseStudyModel = Model<TCaseStudyDocument> & {
  isCaseStudyExist(_id: string): Promise<TCaseStudyDocument | null>;
};
