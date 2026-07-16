import type { Document, Model, Types } from "mongoose";

export type TFileProvider = "local" | "gcs" | "cloudinary";
export type TFileStatus = "active" | "inactive" | "archived";
export type TFileLifecycleState =
  | "uploading"
  | "ready"
  | "orphaned"
  | "deleting"
  | "error";
export type TFilePersistedLifecycleState =
  | TFileLifecycleState
  | "delete_failed";
export const FILE_PURPOSES = [
  "logo",
  "hero",
  "project",
  "article",
  "profile",
  "resume",
  "page",
  "service",
  "skill",
  "timeline",
  "credential",
  "testimonial",
  "social",
  "document",
  "generic",
] as const;

export type TFilePurpose = (typeof FILE_PURPOSES)[number];
export type TFileAccess = "public" | "private";
export type TFileSource = "uploaded" | "generated";
export type TFileType = "image" | "video" | "audio" | "document" | "other";

export type TFileLicense =
  | "owned"
  | "client-provided"
  | "cc0"
  | "cc-by-4.0"
  | "cc-by-sa-4.0"
  | "unsplash"
  | "other";

export type TFileMetadataIssue =
  | "provider"
  | "purpose"
  | "source"
  | "checksum"
  | "dimensions"
  | "alt_text"
  | "focal_point"
  | "dominant_color"
  | "blur_placeholder"
  | "license"
  | "attribution"
  | "generated_provenance";

export type TFileReferenceModel =
  | "Article"
  | "Project"
  | "User"
  | "ArticleCategory"
  | "ProjectCategory"
  | "Review"
  | "Contact"
  | "ProjectResource"
  | "Site"
  | "Page"
  | "Service"
  | "SkillGroup"
  | "Skill"
  | "TimelineEntry"
  | "Credential"
  | "FAQ"
  | "Testimonial"
  | "LegalDocument";

export type TFileReference = {
  model: TFileReferenceModel;
  entity: Types.ObjectId;
  field: string;
  attached_at?: Date;
};

export type TFileMetadata = {
  path?: string;
  bucket?: string;
  storage_key?: string;
  public_id?: string;
  asset_id?: string;
  cloud_name?: string;
  folder?: string;
  resource_type?: "image" | "video" | "raw";
  delivery_type?: string;
  format?: string;
  version?: number;
  etag?: string;
  width?: number;
  height?: number;
  duration?: number;
  extension?: string;
  file_type?: TFileType;
  immutable_key?: string;
  checksum_algorithm?: "sha256";
  canonicalized_at?: Date | string;
};

export type TFileFocalPoint = {
  x: number;
  y: number;
};

export type TFileGenerationProvenance = {
  generator?: string;
  model?: string;
  prompt?: string;
  version?: string;
  seed?: string;
  generated_at?: Date | string;
  /** SHA-256 of the source/master before managed-media canonicalization. */
  source_checksum?: string;
};

export type TFileAttribution = {
  creator_name?: string;
  creator_url?: string;
  source_url?: string;
  credit_text?: string;
  license?: TFileLicense;
  license_url?: string;
};

export type TFile = {
  _id?: Types.ObjectId;
  filename: string;
  originalname: string;
  name: string;
  url: string;
  mimetype: string;
  size: number;
  author: Types.ObjectId;
  provider: TFileProvider;
  category?: string;
  description?: string;
  caption?: string;
  alt_text?: string;
  is_decorative?: boolean;
  focal_point?: TFileFocalPoint;
  dominant_color?: string;
  blur_data_url?: string;
  status: TFileStatus;
  lifecycle_state?: TFilePersistedLifecycleState;
  purpose?: TFilePurpose;
  access?: TFileAccess;
  source?: TFileSource;
  provenance?: TFileGenerationProvenance;
  attribution?: TFileAttribution;
  checksum?: string;
  metadata_status?: "complete" | "incomplete";
  metadata_missing?: TFileMetadataIssue[];
  idempotency_key?: string | null;
  storage_version?: number;
  deletion_lease_token?: string | null;
  deletion_lease_expires_at?: Date | string | null;
  deletion_attempts?: number;
  storage_error_code?: string | null;
  is_deleted?: boolean;
  deleted_at?: Date | string | null;
  metadata?: TFileMetadata;
  references?: TFileReference[];
  created_at?: Date | string;
  updated_at?: Date | string;
};

export type TFileInput = {
  name?: string;
  category?: string;
  description?: string;
  caption?: string;
  status?: TFileStatus;
  purpose?: TFilePurpose;
  source?: TFileSource;
  alt_text?: string;
  is_decorative?: boolean;
  focal_point?: TFileFocalPoint;
  dominant_color?: string;
  blur_data_url?: string;
  provenance?: TFileGenerationProvenance;
  attribution?: TFileAttribution;
  idempotency_key?: string;
};

export interface TFileDocument extends TFile, Document {
  _id: Types.ObjectId;
}

export type TFileModel = Model<TFileDocument> & {
  isFileExist(_id: string): Promise<TFileDocument | null>;
};
