import AppError from "@/builder/app-error";
import httpStatus from "http-status";
import { createHash } from "node:crypto";
import path from "node:path";
import type {
  TFileAccess,
  TFileLifecycleState,
  TFilePurpose,
  TFileProvider,
} from "./file.type";

export type TManagedMediaKind = "raster" | "pdf";

export type TManagedMediaPurposePolicy = {
  purpose: TFilePurpose;
  kind: TManagedMediaKind;
  access: TFileAccess;
  accepted_mime_types: readonly string[];
  accepted_extensions: readonly string[];
  max_input_bytes: number;
  max_output_bytes: number;
  min_width?: number;
  min_height?: number;
  max_width?: number;
  max_height?: number;
  max_pixels?: number;
  allow_animation: false;
  delivery: "inline" | "attachment";
  webp_quality?: number;
};

const MiB = 1_048_576;
const RASTER_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
] as const;
const RASTER_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "avif"] as const;

export const MANAGED_MEDIA_PURPOSE_POLICIES = {
  logo: {
    purpose: "logo",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 2 * MiB,
    max_output_bytes: 2 * MiB,
    min_width: 32,
    min_height: 32,
    max_width: 4096,
    max_height: 4096,
    max_pixels: 16_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 92,
  },
  hero: {
    purpose: "hero",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 8 * MiB,
    max_output_bytes: 8 * MiB,
    min_width: 800,
    min_height: 450,
    max_width: 8192,
    max_height: 8192,
    max_pixels: 40_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 88,
  },
  project: {
    purpose: "project",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 8 * MiB,
    max_output_bytes: 8 * MiB,
    min_width: 320,
    min_height: 180,
    max_width: 8192,
    max_height: 8192,
    max_pixels: 40_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 86,
  },
  article: {
    purpose: "article",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 8 * MiB,
    max_output_bytes: 8 * MiB,
    min_width: 320,
    min_height: 180,
    max_width: 8192,
    max_height: 8192,
    max_pixels: 40_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 86,
  },
  profile: {
    purpose: "profile",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 5 * MiB,
    max_output_bytes: 5 * MiB,
    min_width: 128,
    min_height: 128,
    max_width: 6144,
    max_height: 6144,
    max_pixels: 20_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 88,
  },
  resume: {
    purpose: "resume",
    kind: "pdf",
    access: "private",
    accepted_mime_types: ["application/pdf"],
    accepted_extensions: ["pdf"],
    max_input_bytes: 5 * MiB,
    max_output_bytes: 5 * MiB,
    allow_animation: false,
    delivery: "attachment",
  },
  page: {
    purpose: "page",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 8 * MiB,
    max_output_bytes: 8 * MiB,
    min_width: 320,
    min_height: 180,
    max_width: 8192,
    max_height: 8192,
    max_pixels: 40_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 86,
  },
  service: {
    purpose: "service",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 5 * MiB,
    max_output_bytes: 5 * MiB,
    min_width: 256,
    min_height: 144,
    max_width: 6144,
    max_height: 6144,
    max_pixels: 24_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 86,
  },
  skill: {
    purpose: "skill",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 3 * MiB,
    max_output_bytes: 3 * MiB,
    min_width: 64,
    min_height: 64,
    max_width: 4096,
    max_height: 4096,
    max_pixels: 16_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 88,
  },
  timeline: {
    purpose: "timeline",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 5 * MiB,
    max_output_bytes: 5 * MiB,
    min_width: 256,
    min_height: 144,
    max_width: 6144,
    max_height: 6144,
    max_pixels: 24_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 86,
  },
  credential: {
    purpose: "credential",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 5 * MiB,
    max_output_bytes: 5 * MiB,
    min_width: 256,
    min_height: 144,
    max_width: 6144,
    max_height: 6144,
    max_pixels: 24_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 88,
  },
  testimonial: {
    purpose: "testimonial",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 5 * MiB,
    max_output_bytes: 5 * MiB,
    min_width: 128,
    min_height: 128,
    max_width: 6144,
    max_height: 6144,
    max_pixels: 20_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 88,
  },
  social: {
    purpose: "social",
    kind: "raster",
    access: "public",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 5 * MiB,
    max_output_bytes: 5 * MiB,
    min_width: 600,
    min_height: 315,
    max_width: 4096,
    max_height: 4096,
    max_pixels: 16_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 88,
  },
  document: {
    purpose: "document",
    kind: "pdf",
    access: "private",
    accepted_mime_types: ["application/pdf"],
    accepted_extensions: ["pdf"],
    max_input_bytes: 10 * MiB,
    max_output_bytes: 10 * MiB,
    allow_animation: false,
    delivery: "attachment",
  },
  generic: {
    purpose: "generic",
    kind: "raster",
    access: "private",
    accepted_mime_types: RASTER_MIME_TYPES,
    accepted_extensions: RASTER_EXTENSIONS,
    max_input_bytes: 10 * MiB,
    max_output_bytes: 10 * MiB,
    min_width: 32,
    min_height: 32,
    max_width: 8192,
    max_height: 8192,
    max_pixels: 40_000_000,
    allow_animation: false,
    delivery: "inline",
    webp_quality: 86,
  },
} as const satisfies Record<TFilePurpose, TManagedMediaPurposePolicy>;

export const FILE_PURPOSES = Object.freeze(
  Object.keys(MANAGED_MEDIA_PURPOSE_POLICIES) as TFilePurpose[]
);

export const isFilePurpose = (value: unknown): value is TFilePurpose =>
  typeof value === "string" && FILE_PURPOSES.includes(value as TFilePurpose);

export const getManagedMediaPurposePolicy = (
  value: unknown
): TManagedMediaPurposePolicy => {
  if (!isFilePurpose(value)) {
    throw new AppError(httpStatus.BAD_REQUEST, "Unsupported media purpose");
  }
  return MANAGED_MEDIA_PURPOSE_POLICIES[value];
};

const MIME_ALIASES: Readonly<Record<string, string>> = {
  "image/jpg": "image/jpeg",
  "image/x-png": "image/png",
};

export const normalizeMediaMime = (value: string): string =>
  MIME_ALIASES[value.trim().toLowerCase()] || value.trim().toLowerCase();

export const normalizeMediaFilename = (value: string): string => {
  const leaf = path.basename(value.replaceAll("\\", "/"));
  const originalExtension = path.extname(leaf);
  const extension = originalExtension.toLowerCase();
  const base = path
    .basename(leaf.slice(0, leaf.length - originalExtension.length))
    .normalize("NFKD")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${base || "media"}${extension.slice(0, 12)}`;
};

export const getFilenameExtension = (value: string): string =>
  path.extname(normalizeMediaFilename(value)).slice(1).toLowerCase();

export const buildMediaOwnerScope = (ownerId: string): string =>
  createHash("sha256").update(ownerId).digest("hex").slice(0, 16);

export const buildImmutableStorageKey = (input: {
  owner_scope: string;
  checksum: string;
  purpose: TFilePurpose;
  version?: number;
  ingestion_scope?: string;
}): string => {
  const ownerScope = input.owner_scope.toLowerCase();
  const checksum = input.checksum.toLowerCase();
  if (
    !isFilePurpose(input.purpose) ||
    !/^[a-f0-9]{16}$/.test(ownerScope) ||
    !/^[a-f0-9]{64}$/.test(checksum)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid managed media key input"
    );
  }
  const version = input.version ?? 1;
  if (!Number.isSafeInteger(version) || version < 1) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid managed media version");
  }
  if (
    input.ingestion_scope !== undefined &&
    !/^[a-f0-9]{16}$/.test(input.ingestion_scope)
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Invalid managed media ingestion scope"
    );
  }
  const objectName = input.ingestion_scope
    ? `${checksum}-${input.ingestion_scope}`
    : checksum;
  return `v${version}/${input.purpose}/${ownerScope}/${checksum.slice(0, 2)}/${objectName}`;
};

const decodePathSafely = (pathname: string): string => {
  try {
    return decodeURIComponent(pathname);
  } catch {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Storage returned an invalid URL"
    );
  }
};

export const assertAllowedProviderUrl = (input: {
  provider: Extract<TFileProvider, "gcs" | "cloudinary">;
  url: string;
  bucket?: string;
  cloud_name?: string;
  allow_search?: boolean;
}): URL => {
  let parsed: URL;
  try {
    parsed = new URL(input.url);
  } catch {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Storage returned an invalid URL"
    );
  }

  if (
    parsed.protocol !== "https:" ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.hash ||
    (!input.allow_search && parsed.search)
  ) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Storage returned an unsafe URL"
    );
  }

  const decodedPath = decodePathSafely(parsed.pathname);
  if (decodedPath.includes("\\") || decodedPath.split("/").includes("..")) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Storage returned an unsafe URL"
    );
  }

  if (input.provider === "cloudinary") {
    if (!input.cloud_name || parsed.hostname !== "res.cloudinary.com") {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "Unexpected Cloudinary delivery URL"
      );
    }
    const expectedPrefix = `/${encodeURIComponent(input.cloud_name)}/`;
    if (!parsed.pathname.startsWith(expectedPrefix)) {
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "Unexpected Cloudinary delivery URL"
      );
    }
  } else {
    if (!input.bucket || parsed.hostname !== "storage.googleapis.com") {
      throw new AppError(httpStatus.BAD_GATEWAY, "Unexpected GCP delivery URL");
    }
    const expectedPrefix = `/${encodeURIComponent(input.bucket)}/`;
    if (!parsed.pathname.startsWith(expectedPrefix)) {
      throw new AppError(httpStatus.BAD_GATEWAY, "Unexpected GCP delivery URL");
    }
  }

  return parsed;
};

const PURPOSE_COMPATIBILITY: Readonly<
  Record<TFilePurpose, readonly TFilePurpose[]>
> = {
  logo: ["logo"],
  hero: ["hero"],
  project: ["project"],
  article: ["article"],
  profile: ["profile"],
  resume: ["resume"],
  page: ["page"],
  service: ["service"],
  skill: ["skill"],
  timeline: ["timeline"],
  credential: ["credential"],
  testimonial: ["testimonial"],
  social: ["social"],
  document: ["document"],
  generic: ["generic"],
};

export const isMediaPurposeCompatible = (
  actual: TFilePurpose | undefined,
  expected: readonly TFilePurpose[]
): boolean => {
  if (!actual) return false;
  return expected.some(
    (purpose) =>
      isFilePurpose(purpose) && PURPOSE_COMPATIBILITY[purpose].includes(actual)
  );
};

export const isAttachableMediaRecord = (input: {
  lifecycle_state?: TFileLifecycleState | "delete_failed";
  is_deleted?: boolean;
  purpose?: TFilePurpose;
  expected_purposes: readonly TFilePurpose[];
}): boolean =>
  input.is_deleted !== true &&
  input.lifecycle_state === "ready" &&
  isMediaPurposeCompatible(input.purpose, input.expected_purposes);

const ALLOWED_TRANSITIONS: Readonly<
  Record<TFileLifecycleState, readonly TFileLifecycleState[]>
> = {
  uploading: ["ready", "orphaned", "error"],
  ready: ["deleting"],
  orphaned: ["deleting", "error"],
  deleting: ["error"],
  error: ["deleting"],
};

export const canTransitionMediaLifecycle = (
  from: TFileLifecycleState,
  to: TFileLifecycleState
): boolean =>
  from in ALLOWED_TRANSITIONS &&
  to in ALLOWED_TRANSITIONS &&
  (from === to || ALLOWED_TRANSITIONS[from].includes(to));

export const clampPrivateDeliveryTtl = (seconds: number): number => {
  if (!Number.isFinite(seconds)) return 300;
  return Math.min(900, Math.max(30, Math.trunc(seconds)));
};

export const getSafeStorageErrorCode = (
  operation: "upload" | "delete" | "delivery"
) => `STORAGE_${operation.toUpperCase()}_FAILED` as const;
