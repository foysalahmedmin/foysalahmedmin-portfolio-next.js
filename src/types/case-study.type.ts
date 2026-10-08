import type {
  CaseStudyLinkVisibility,
  CaseStudyOutcome,
} from "@/lib/content/case-study-contract";
import type { PillarKey } from "@/lib/content/pillars";
import type { ProjectType } from "@/lib/content/portfolio-contract";
import type { RichContentDocument } from "@/lib/content/rich-content";
import type { TFilePopulated } from "./file.type";

export type TCaseStudyStatus = "draft" | "pending" | "published" | "archived";

export type TCaseStudyCategoryRef = {
  _id: string;
  name: string;
  slug: string;
};

export type TCaseStudyAuthor = {
  _id: string;
  name: string;
  email?: string;
  image?: TFilePopulated | null;
};

export type TCaseStudy = {
  _id: string;
  name: string;
  slug?: string;
  description?: string;
  overview?: string;
  content?: string;
  rich_content?: RichContentDocument;
  thumbnail?: TFilePopulated | null;
  images?: TFilePopulated[];
  category?: TCaseStudyCategoryRef | null;
  author?: TCaseStudyAuthor | null;
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
  started_at?: string;
  ended_at?: string;
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
  status: TCaseStudyStatus;
  is_featured: boolean;
  published_at?: string;
  expired_at?: string | null;
  layout?: string;
  created_at?: string;
  updated_at?: string;
};

/**
 * The public payload: the server removes the draft status, hides the client
 * name unless it was opted in, and drops unverified outcomes and private links.
 */
export type TPublicCaseStudy = Omit<
  TCaseStudy,
  "status" | "show_client_name" | "live_url_visibility" | "source_url_visibility"
>;

export type TCaseStudyListItem = Pick<
  TCaseStudy,
  | "_id"
  | "slug"
  | "name"
  | "description"
  | "thumbnail"
  | "category"
  | "client_name"
  | "client_industry"
  | "engagement_type"
  | "primary_pillar"
  | "secondary_pillars"
  | "role"
  | "duration_label"
  | "tech_stack"
  | "outcomes"
  | "is_featured"
  | "published_at"
  | "updated_at"
>;

export type TCaseStudyInput = Partial<
  Omit<
    TCaseStudy,
    | "_id"
    | "thumbnail"
    | "images"
    | "category"
    | "author"
    | "status"
    | "created_at"
    | "updated_at"
    | "rich_content"
  >
> & {
  thumbnail?: string | null;
  images?: string[];
  category?: string;
  status?: TCaseStudyStatus;
};
