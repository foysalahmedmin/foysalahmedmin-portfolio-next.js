export type TFileProvider = "local" | "gcs" | "cloudinary";
export type TFilePurpose =
  | "logo"
  | "hero"
  | "project"
  | "article"
  | "profile"
  | "resume"
  | "page"
  | "service"
  | "skill"
  | "timeline"
  | "credential"
  | "testimonial"
  | "social"
  | "document"
  | "generic";

export type TFileSource = "uploaded" | "generated";
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
export type TFileLicense =
  | "owned"
  | "client-provided"
  | "cc0"
  | "cc-by-4.0"
  | "cc-by-sa-4.0"
  | "unsplash"
  | "other";

export type TFileFocalPoint = { x: number; y: number };

export type TFileGenerationProvenance = {
  generator?: string;
  model?: string;
  prompt?: string;
  version?: string;
  seed?: string;
  generated_at?: string;
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

export type TFileEditorialMetadataInput = {
  source?: TFileSource;
  alt_text?: string;
  is_decorative?: boolean;
  focal_point?: TFileFocalPoint;
  dominant_color?: string;
  blur_data_url?: string;
  provenance?: TFileGenerationProvenance;
  attribution?: TFileAttribution;
};

export type TFileMetadata = {
  file_type?: "image" | "video" | "audio" | "document" | "other";
  width?: number;
  height?: number;
  duration?: number;
  extension?: string;
  format?: string;
  [key: string]: unknown;
};

export type TFileReference = {
  model: TFileReferenceModel;
  entity: string;
  field: string;
  attached_at?: string;
};

export type TFilePopulated = {
  _id: string;
  url: string;
  filename: string;
  originalname?: string;
  name?: string;
  mimetype: string;
  size: number;
  provider: TFileProvider;
  category?: string;
  purpose?: TFilePurpose;
  access?: "public" | "private";
  source?: TFileSource;
  caption?: string;
  description?: string;
  alt_text?: string;
  is_decorative?: boolean;
  focal_point?: TFileFocalPoint;
  dominant_color?: string;
  blur_data_url?: string;
  provenance?: TFileGenerationProvenance;
  attribution?: TFileAttribution;
  metadata_status?: "complete" | "incomplete";
  metadata_missing?: TFileMetadataIssue[];
  checksum?: string;
  status?: "active" | "inactive" | "archived";
  lifecycle_state?:
    | "uploading"
    | "ready"
    | "orphaned"
    | "deleting"
    | "error"
    | "delete_failed";
  metadata?: TFileMetadata;
  references?: TFileReference[];
  is_deleted?: boolean;
  deleted_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type TFileUploadResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TFilePopulated[];
};
