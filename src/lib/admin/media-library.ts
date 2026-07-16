import type {
  TFileAttribution,
  TFileEditorialMetadataInput,
  TFileGenerationProvenance,
  TFileLicense,
  TFileMetadataIssue,
  TFilePopulated,
  TFilePurpose,
  TFileSource,
} from "@/types/file.type";

export const MEDIA_LIBRARY_MAX_UPLOADS = 10;
export const MEDIA_LIBRARY_PAGE_SIZES = [12, 24, 48, 96] as const;

export type MediaPurposeOption = Readonly<{
  value: TFilePurpose;
  label: string;
  access: "public" | "private";
  kind: "image" | "document";
}>;

export const MEDIA_PURPOSE_OPTIONS: readonly MediaPurposeOption[] = [
  { value: "logo", label: "Logo", access: "public", kind: "image" },
  { value: "hero", label: "Hero", access: "public", kind: "image" },
  { value: "project", label: "Project", access: "public", kind: "image" },
  { value: "article", label: "Article", access: "public", kind: "image" },
  { value: "profile", label: "Profile", access: "public", kind: "image" },
  { value: "resume", label: "Resume", access: "private", kind: "document" },
  { value: "page", label: "Page", access: "public", kind: "image" },
  { value: "service", label: "Service", access: "public", kind: "image" },
  { value: "skill", label: "Skill", access: "public", kind: "image" },
  { value: "timeline", label: "Timeline", access: "public", kind: "image" },
  {
    value: "credential",
    label: "Credential",
    access: "public",
    kind: "image",
  },
  {
    value: "testimonial",
    label: "Testimonial",
    access: "public",
    kind: "image",
  },
  { value: "social", label: "Social", access: "public", kind: "image" },
  {
    value: "document",
    label: "Document",
    access: "private",
    kind: "document",
  },
  { value: "generic", label: "Generic", access: "private", kind: "image" },
] as const;

export const MEDIA_SOURCE_OPTIONS = [
  { value: "uploaded", label: "Original / supplied" },
  { value: "generated", label: "AI generated" },
] as const satisfies readonly { value: TFileSource; label: string }[];

export const MEDIA_LICENSE_OPTIONS = [
  { value: "", label: "Not recorded" },
  { value: "owned", label: "Owned" },
  { value: "client-provided", label: "Client provided" },
  { value: "cc0", label: "CC0" },
  { value: "cc-by-4.0", label: "CC BY 4.0" },
  { value: "cc-by-sa-4.0", label: "CC BY-SA 4.0" },
  { value: "unsplash", label: "Unsplash" },
  { value: "other", label: "Other" },
] as const satisfies readonly { value: TFileLicense | ""; label: string }[];

export const MEDIA_METADATA_ISSUES = [
  "provider",
  "purpose",
  "source",
  "checksum",
  "dimensions",
  "alt_text",
  "focal_point",
  "dominant_color",
  "blur_placeholder",
  "license",
  "attribution",
  "generated_provenance",
] as const satisfies readonly TFileMetadataIssue[];

export const MEDIA_LIBRARY_SORT_OPTIONS = [
  { value: "-updated_at", label: "Recently updated" },
  { value: "-created_at", label: "Newest uploaded" },
  { value: "created_at", label: "Oldest uploaded" },
  { value: "name", label: "Name A–Z" },
  { value: "-name", label: "Name Z–A" },
  { value: "-size", label: "Largest first" },
  { value: "size", label: "Smallest first" },
  { value: "provider", label: "Provider" },
  { value: "purpose", label: "Purpose" },
  { value: "metadata_status", label: "Metadata health" },
] as const;

export type MediaLibraryFilterKey =
  | "provider"
  | "purpose"
  | "access"
  | "lifecycle_state"
  | "metadata_status"
  | "metadata_missing"
  | "deleted_scope";

export type MediaLibraryFilters = Partial<
  Record<MediaLibraryFilterKey, string>
>;

export type MediaLibraryQuery = Readonly<{
  search: string;
  sort: string;
  page: number;
  limit: number;
  filters: MediaLibraryFilters;
}>;

export const DEFAULT_MEDIA_LIBRARY_QUERY: MediaLibraryQuery = {
  search: "",
  sort: "-updated_at",
  page: 1,
  limit: 24,
  filters: {},
};

const FILTER_VALUES: Readonly<Record<MediaLibraryFilterKey, Set<string>>> = {
  provider: new Set(["local", "gcs", "cloudinary"]),
  purpose: new Set(MEDIA_PURPOSE_OPTIONS.map(({ value }) => value)),
  access: new Set(["public", "private"]),
  lifecycle_state: new Set([
    "uploading",
    "ready",
    "orphaned",
    "deleting",
    "error",
    "delete_failed",
  ]),
  metadata_status: new Set(["complete", "incomplete"]),
  metadata_missing: new Set(MEDIA_METADATA_ISSUES),
  deleted_scope: new Set(["active", "with_deleted", "only_deleted"]),
};

const SORT_VALUES: ReadonlySet<string> = new Set(
  MEDIA_LIBRARY_SORT_OPTIONS.map(({ value }) => value)
);

const normalizePositiveInteger = (
  value: number,
  fallback: number,
  maximum: number
) =>
  Number.isSafeInteger(value) && value > 0
    ? Math.min(value, maximum)
    : fallback;

export const normalizeMediaLibraryQuery = (
  input: Partial<MediaLibraryQuery>
): MediaLibraryQuery => {
  const filters = Object.fromEntries(
    Object.entries(input.filters ?? {}).filter(
      ([key, value]) =>
        key in FILTER_VALUES &&
        typeof value === "string" &&
        FILTER_VALUES[key as MediaLibraryFilterKey].has(value)
    )
  ) as MediaLibraryFilters;

  return {
    search:
      typeof input.search === "string" ? input.search.trim().slice(0, 100) : "",
    sort:
      typeof input.sort === "string" && SORT_VALUES.has(input.sort)
        ? input.sort
        : DEFAULT_MEDIA_LIBRARY_QUERY.sort,
    page: normalizePositiveInteger(
      Number(input.page),
      DEFAULT_MEDIA_LIBRARY_QUERY.page,
      1_000_000
    ),
    limit: normalizePositiveInteger(
      Number(input.limit),
      DEFAULT_MEDIA_LIBRARY_QUERY.limit,
      100
    ),
    filters,
  };
};

export const buildMediaLibrarySearchParams = (
  input: Partial<MediaLibraryQuery>
): URLSearchParams => {
  const query = normalizeMediaLibraryQuery(input);
  const params = new URLSearchParams({
    page: String(query.page),
    limit: String(query.limit),
    sort: query.sort,
  });
  if (query.search) params.set("search", query.search);
  Object.entries(query.filters).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params;
};

export const getMediaPurposeOption = (
  purpose: TFilePurpose
): MediaPurposeOption =>
  MEDIA_PURPOSE_OPTIONS.find(({ value }) => value === purpose) ??
  MEDIA_PURPOSE_OPTIONS[MEDIA_PURPOSE_OPTIONS.length - 1];

export const getMediaAccept = (purpose: TFilePurpose): string =>
  getMediaPurposeOption(purpose).kind === "document"
    ? "application/pdf,.pdf"
    : "image/jpeg,image/png,image/webp,image/avif,.jpg,.jpeg,.png,.webp,.avif";

export type MediaMetadataFormValues = {
  name: string;
  description: string;
  caption: string;
  status: "active" | "inactive" | "archived";
  source: TFileSource | "";
  alt_text: string;
  is_decorative: boolean;
  focal_point_x: string;
  focal_point_y: string;
  dominant_color: string;
  blur_data_url: string;
  attribution_creator_name: string;
  attribution_creator_url: string;
  attribution_source_url: string;
  attribution_credit_text: string;
  attribution_license: TFileLicense | "";
  attribution_license_url: string;
  provenance_generator: string;
  provenance_model: string;
  provenance_prompt: string;
  provenance_version: string;
  provenance_generated_at: string;
  provenance_source_checksum: string;
};

export type MediaMetadataFieldErrors = Partial<
  Record<keyof MediaMetadataFormValues | "form", string>
>;

const toDateTimeLocal = (value: string | undefined) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? ""
    : new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
};

export const buildMediaMetadataFormValues = (
  file: TFilePopulated
): MediaMetadataFormValues => ({
  name: file.name || file.originalname || file.filename,
  description: file.description || "",
  caption: file.caption || "",
  status: file.status || "active",
  source: file.source || "",
  alt_text: file.alt_text || "",
  is_decorative: Boolean(file.is_decorative),
  focal_point_x:
    file.focal_point?.x === undefined ? "" : String(file.focal_point.x),
  focal_point_y:
    file.focal_point?.y === undefined ? "" : String(file.focal_point.y),
  dominant_color: file.dominant_color || "",
  blur_data_url: file.blur_data_url || "",
  attribution_creator_name: file.attribution?.creator_name || "",
  attribution_creator_url: file.attribution?.creator_url || "",
  attribution_source_url: file.attribution?.source_url || "",
  attribution_credit_text: file.attribution?.credit_text || "",
  attribution_license: file.attribution?.license || "",
  attribution_license_url: file.attribution?.license_url || "",
  provenance_generator: file.provenance?.generator || "",
  provenance_model: file.provenance?.model || "",
  // Prompt and seed are deliberately never read back into the admin client.
  provenance_prompt: "",
  provenance_version: file.provenance?.version || "",
  provenance_generated_at: toDateTimeLocal(file.provenance?.generated_at),
  provenance_source_checksum: file.provenance?.source_checksum || "",
});

const isPublicHttpsUrl = (value: string): boolean => {
  if (!value) return true;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" && !url.username && !url.password && !url.hash
    );
  } catch {
    return false;
  }
};

const isRaster = (file: TFilePopulated) =>
  file.metadata?.file_type === "image" || file.mimetype.startsWith("image/");

export const validateMediaMetadataForm = (
  file: TFilePopulated,
  values: MediaMetadataFormValues
): MediaMetadataFieldErrors => {
  const errors: MediaMetadataFieldErrors = {};
  if (!values.name.trim()) errors.name = "Display name is required.";
  if (!values.source) errors.source = "Record how this asset was created.";

  if (isRaster(file)) {
    if (values.is_decorative && values.alt_text.trim()) {
      errors.alt_text = "Decorative media must use empty alt text.";
    }
    if (!values.is_decorative && !values.alt_text.trim()) {
      errors.alt_text = "Describe informative media or mark it decorative.";
    }
  }

  const hasFocalX = Boolean(values.focal_point_x.trim());
  const hasFocalY = Boolean(values.focal_point_y.trim());
  if (hasFocalX !== hasFocalY) {
    errors.focal_point_x = "Both focal point coordinates are required.";
    errors.focal_point_y = "Both focal point coordinates are required.";
  } else if (hasFocalX && hasFocalY) {
    const x = Number(values.focal_point_x);
    const y = Number(values.focal_point_y);
    if (!Number.isFinite(x) || x < 0 || x > 1) {
      errors.focal_point_x = "Use a value from 0 to 1.";
    }
    if (!Number.isFinite(y) || y < 0 || y > 1) {
      errors.focal_point_y = "Use a value from 0 to 1.";
    }
  }

  if (
    values.dominant_color.trim() &&
    !/^#[a-f0-9]{6}$/i.test(values.dominant_color.trim())
  ) {
    errors.dominant_color = "Use a six-digit hex color such as #102a43.";
  }
  if (
    values.blur_data_url.trim() &&
    !/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/.test(
      values.blur_data_url.trim()
    )
  ) {
    errors.blur_data_url = "Use a supported base64 image data URL.";
  }

  (
    [
      "attribution_creator_url",
      "attribution_source_url",
      "attribution_license_url",
    ] as const
  ).forEach((field) => {
    if (!isPublicHttpsUrl(values[field].trim())) {
      errors[field] =
        "Use a public HTTPS URL without credentials or fragments.";
    }
  });

  if (
    values.provenance_source_checksum.trim() &&
    !/^[a-f0-9]{64}$/i.test(values.provenance_source_checksum.trim())
  ) {
    errors.provenance_source_checksum =
      "Use the 64-character SHA-256 source checksum.";
  }
  if (
    values.provenance_generated_at &&
    Number.isNaN(new Date(values.provenance_generated_at).getTime())
  ) {
    errors.provenance_generated_at = "Use a valid generation date and time.";
  }
  return errors;
};

const compactRecord = <T extends Record<string, unknown>>(value: T) =>
  Object.fromEntries(
    Object.entries(value).filter(
      ([, item]) => item !== undefined && item !== ""
    )
  ) as Partial<T>;

export type AdminMediaUpdatePayload = TFileEditorialMetadataInput & {
  name: string;
  description: string;
  caption: string;
  status: "active" | "inactive" | "archived";
};

export const buildMediaMetadataPayload = (
  file: TFilePopulated,
  values: MediaMetadataFormValues
): AdminMediaUpdatePayload => {
  const provenance = compactRecord<TFileGenerationProvenance>({
    generator: values.provenance_generator.trim() || undefined,
    model: values.provenance_model.trim() || undefined,
    prompt: values.provenance_prompt.trim() || undefined,
    version: values.provenance_version.trim() || undefined,
    generated_at: values.provenance_generated_at
      ? new Date(values.provenance_generated_at).toISOString()
      : undefined,
    source_checksum:
      values.provenance_source_checksum.trim().toLowerCase() || undefined,
  });
  const attribution = compactRecord<TFileAttribution>({
    creator_name: values.attribution_creator_name.trim() || undefined,
    creator_url: values.attribution_creator_url.trim() || undefined,
    source_url: values.attribution_source_url.trim() || undefined,
    credit_text: values.attribution_credit_text.trim() || undefined,
    license: values.attribution_license || undefined,
    license_url: values.attribution_license_url.trim() || undefined,
  });
  const hasFocalPoint =
    values.focal_point_x.trim() && values.focal_point_y.trim();

  return {
    name: values.name.trim(),
    description: values.description.trim(),
    caption: values.caption.trim(),
    status: values.status,
    source: values.source || undefined,
    ...(isRaster(file)
      ? {
          is_decorative: values.is_decorative,
          alt_text: values.is_decorative ? "" : values.alt_text.trim(),
        }
      : {}),
    ...(hasFocalPoint
      ? {
          focal_point: {
            x: Number(values.focal_point_x),
            y: Number(values.focal_point_y),
          },
        }
      : {}),
    ...(values.dominant_color.trim()
      ? { dominant_color: values.dominant_color.trim().toLowerCase() }
      : {}),
    ...(values.blur_data_url.trim()
      ? { blur_data_url: values.blur_data_url.trim() }
      : {}),
    ...(Object.keys(provenance).length ? { provenance } : {}),
    ...(Object.keys(attribution).length ? { attribution } : {}),
  };
};

export const getMediaReferenceCount = (file: TFilePopulated): number =>
  file.references?.length ?? 0;

export const isMediaSoftDeletable = (file: TFilePopulated): boolean =>
  !file.is_deleted &&
  file.lifecycle_state === "ready" &&
  getMediaReferenceCount(file) === 0;

export const isMediaRestorable = (file: TFilePopulated): boolean =>
  Boolean(file.is_deleted) &&
  (!file.lifecycle_state || file.lifecycle_state === "ready");

export const isMediaPermanentlyDeletable = (file: TFilePopulated): boolean =>
  Boolean(file.is_deleted) && getMediaReferenceCount(file) === 0;
