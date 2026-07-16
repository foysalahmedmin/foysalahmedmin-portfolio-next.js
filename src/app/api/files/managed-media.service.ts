import AppError from "@/builder/app-error";
import { ENV } from "@/config";
import {
  deleteCloudStorageObject,
  getCloudStorageDeliveryUrl,
  getConfiguredStorageProvider,
  getStorageAdapter,
  listCloudStorageManagedObjects,
  type TCloudinaryResourceType,
  type TStorageResult,
  type TStoredObject,
} from "@/lib/storage";
import type { TStorageFile } from "@/lib/storage/storage.type";
import { fileTypeFromBuffer } from "file-type";
import httpStatus from "http-status";
import { createHash } from "node:crypto";
import sharp from "sharp";
import type {
  TFile,
  TFileAccess,
  TFilePurpose,
  TFileProvider,
} from "./file.type";
import {
  assertAllowedProviderUrl,
  buildImmutableStorageKey,
  buildMediaOwnerScope,
  clampPrivateDeliveryTtl,
  getFilenameExtension,
  getManagedMediaPurposePolicy,
  getSafeStorageErrorCode,
  normalizeMediaFilename,
  normalizeMediaMime,
} from "./managed-media.policy";

const DEFAULT_MAX_REQUEST_BYTES = 64 * 1_048_576;
const DEFAULT_MAX_CONCURRENCY = 3;
const MAX_UPLOAD_FILES = 10;

const parsePositiveInt = (
  value: string | undefined,
  fallback: number
): number => {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
};

export const getManagedUploadLimits = () => ({
  max_request_bytes: parsePositiveInt(
    process.env.MEDIA_UPLOAD_MAX_REQUEST_BYTES,
    DEFAULT_MAX_REQUEST_BYTES
  ),
  max_concurrency: parsePositiveInt(
    process.env.MEDIA_UPLOAD_MAX_CONCURRENCY,
    DEFAULT_MAX_CONCURRENCY
  ),
  max_files: MAX_UPLOAD_FILES,
});

type TUploadConcurrencyState = { active: number };
const concurrencyKey = Symbol.for("foysalahmedmin.managed-media.concurrency");
const globalWithConcurrency = globalThis as typeof globalThis & {
  [concurrencyKey]?: TUploadConcurrencyState;
};
const getConcurrencyState = (): TUploadConcurrencyState =>
  (globalWithConcurrency[concurrencyKey] ??= { active: 0 });

export const assertEarlyUploadRequest = (request: Request): void => {
  const contentType = request.headers.get("content-type")?.toLowerCase() || "";
  if (!contentType.startsWith("multipart/form-data;")) {
    throw new AppError(
      httpStatus.UNSUPPORTED_MEDIA_TYPE,
      "A multipart upload is required"
    );
  }

  const rawLength = request.headers.get("content-length");
  if (!rawLength || !/^\d+$/.test(rawLength)) {
    throw new AppError(
      httpStatus.LENGTH_REQUIRED,
      "Upload Content-Length is required"
    );
  }
  const length = Number(rawLength);
  if (!Number.isSafeInteger(length) || length <= 0) {
    throw new AppError(httpStatus.BAD_REQUEST, "Invalid upload size");
  }
  if (length > getManagedUploadLimits().max_request_bytes) {
    throw new AppError(
      httpStatus.REQUEST_ENTITY_TOO_LARGE,
      "Upload request is too large"
    );
  }
};

export const acquireUploadConcurrencySlot = (): (() => void) => {
  const state = getConcurrencyState();
  if (state.active >= getManagedUploadLimits().max_concurrency) {
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      "Too many uploads are currently in progress"
    );
  }
  state.active += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    state.active = Math.max(0, state.active - 1);
  };
};

export type TPreparedManagedMedia = {
  buffer: Buffer;
  original_name: string;
  filename: string;
  mimetype: string;
  extension: string;
  size: number;
  checksum: string;
  purpose: TFilePurpose;
  access: TFileAccess;
  width?: number;
  height?: number;
  file_type: "image" | "document";
  delivery: "inline" | "attachment";
};

const hasActiveTextSignature = (buffer: Buffer): boolean => {
  const prefix = buffer
    .subarray(0, 4096)
    .toString("utf8")
    .replace(/^\uFEFF/, "");
  return /<\s*(?:!doctype\s+html|html\b|svg\b|script\b)|<\?xml[\s\S]*?<\s*svg\b/i.test(
    prefix
  );
};

const assertDimensions = (
  width: number,
  height: number,
  policy: ReturnType<typeof getManagedMediaPurposePolicy>
): void => {
  if (
    (policy.min_width && width < policy.min_width) ||
    (policy.min_height && height < policy.min_height) ||
    (policy.max_width && width > policy.max_width) ||
    (policy.max_height && height > policy.max_height) ||
    (policy.max_pixels && width * height > policy.max_pixels)
  ) {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "Media dimensions do not meet the selected purpose policy"
    );
  }
};

const prepareRaster = async (
  input: Buffer,
  policy: ReturnType<typeof getManagedMediaPurposePolicy>
): Promise<Pick<TPreparedManagedMedia, "buffer" | "width" | "height">> => {
  try {
    const image = sharp(input, {
      animated: true,
      failOn: "error",
      limitInputPixels: policy.max_pixels || 1,
      sequentialRead: true,
    });
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1) {
      throw new AppError(
        httpStatus.UNPROCESSABLE_ENTITY,
        "Animated or malformed images are not accepted"
      );
    }
    assertDimensions(metadata.width, metadata.height, policy);

    const output = await image
      .rotate()
      .webp({
        quality: policy.webp_quality || 86,
        effort: 4,
        smartSubsample: true,
      })
      .toBuffer({ resolveWithObject: true });
    assertDimensions(output.info.width, output.info.height, policy);
    if (output.data.byteLength > policy.max_output_bytes) {
      throw new AppError(
        httpStatus.REQUEST_ENTITY_TOO_LARGE,
        "Canonical media exceeds the selected purpose limit"
      );
    }
    return {
      buffer: output.data,
      width: output.info.width,
      height: output.info.height,
    };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "Image decoding or canonicalization failed"
    );
  }
};

const assertPdfEnvelope = (buffer: Buffer): void => {
  const prefix = buffer.subarray(0, 8).toString("ascii");
  const suffix = buffer
    .subarray(Math.max(0, buffer.length - 2048))
    .toString("ascii");
  if (!prefix.startsWith("%PDF-") || !suffix.includes("%%EOF")) {
    throw new AppError(httpStatus.UNPROCESSABLE_ENTITY, "Malformed PDF upload");
  }
};

export const prepareManagedMedia = async (input: {
  file: File;
  purpose: TFilePurpose;
}): Promise<TPreparedManagedMedia> => {
  const policy = getManagedMediaPurposePolicy(input.purpose);
  if (input.file.size <= 0 || input.file.size > policy.max_input_bytes) {
    throw new AppError(
      httpStatus.REQUEST_ENTITY_TOO_LARGE,
      "Media size does not meet the selected purpose policy"
    );
  }

  const buffer = Buffer.from(await input.file.arrayBuffer());
  if (buffer.byteLength !== input.file.size || hasActiveTextSignature(buffer)) {
    throw new AppError(
      httpStatus.UNSUPPORTED_MEDIA_TYPE,
      "SVG, HTML, or malformed uploads are not accepted"
    );
  }

  let detected: Awaited<ReturnType<typeof fileTypeFromBuffer>>;
  try {
    detected = await fileTypeFromBuffer(buffer);
  } catch {
    throw new AppError(
      httpStatus.UNPROCESSABLE_ENTITY,
      "Media signature detection failed"
    );
  }
  if (!detected) {
    throw new AppError(
      httpStatus.UNSUPPORTED_MEDIA_TYPE,
      "Unknown or unsupported media signature"
    );
  }

  const detectedMime = normalizeMediaMime(detected.mime);
  const declaredMime = normalizeMediaMime(input.file.type || detectedMime);
  const extension = getFilenameExtension(input.file.name);
  const detectedExtensions: Readonly<Record<string, readonly string[]>> = {
    "image/jpeg": ["jpg", "jpeg"],
    "image/png": ["png"],
    "image/webp": ["webp"],
    "image/avif": ["avif"],
    "application/pdf": ["pdf"],
  };
  if (
    !policy.accepted_mime_types.includes(detectedMime) ||
    declaredMime !== detectedMime ||
    !extension ||
    !policy.accepted_extensions.includes(extension) ||
    !detectedExtensions[detectedMime]?.includes(extension)
  ) {
    throw new AppError(
      httpStatus.UNSUPPORTED_MEDIA_TYPE,
      "Media signature, MIME type, extension, and purpose do not match"
    );
  }

  const originalName = normalizeMediaFilename(input.file.name);
  if (policy.kind === "pdf") {
    assertPdfEnvelope(buffer);
    const checksum = createHash("sha256").update(buffer).digest("hex");
    return {
      buffer,
      original_name: originalName,
      filename: `${originalName.replace(/\.pdf$/i, "")}.pdf`,
      mimetype: "application/pdf",
      extension: "pdf",
      size: buffer.byteLength,
      checksum,
      purpose: input.purpose,
      access: policy.access,
      file_type: "document",
      delivery: policy.delivery,
    };
  }

  const raster = await prepareRaster(buffer, policy);
  const checksum = createHash("sha256").update(raster.buffer).digest("hex");
  return {
    ...raster,
    original_name: originalName,
    filename: `${originalName.replace(/\.[^.]+$/, "")}.webp`,
    mimetype: "image/webp",
    extension: "webp",
    size: raster.buffer.byteLength,
    checksum,
    purpose: input.purpose,
    access: policy.access,
    file_type: "image",
    delivery: policy.delivery,
  };
};

export const uploadPreparedMedia = async (input: {
  prepared: TPreparedManagedMedia;
  owner_id: string;
  ingestion_scope: string;
  field_name?: string;
  storage?: Pick<TStorageFile, "bucket" | "folder">;
}): Promise<TStorageResult & { immutable_key: string }> => {
  const immutableKey = buildImmutableStorageKey({
    owner_scope: buildMediaOwnerScope(input.owner_id),
    checksum: input.prepared.checksum,
    purpose: input.prepared.purpose,
    ingestion_scope: input.ingestion_scope,
  });
  const adapter = getStorageAdapter(getConfiguredStorageProvider());

  try {
    const result = await adapter.upload(
      {
        buffer: input.prepared.buffer,
        original_name: input.prepared.original_name,
        filename: input.prepared.filename,
        mimetype: input.prepared.mimetype,
        checksum: input.prepared.checksum,
        immutable_key: immutableKey,
        access: input.prepared.access,
      },
      {
        name: input.field_name || "file",
        bucket: input.storage?.bucket,
        folder: input.storage?.folder,
      }
    );

    const providerShapeIsValid =
      result.size === input.prepared.size &&
      result.mimetype === input.prepared.mimetype &&
      (result.provider !== "cloudinary" ||
        (result.resource_type ===
          (input.prepared.file_type === "document" ? "raw" : "image") &&
          (input.prepared.file_type === "document" ||
            (result.format === "webp" &&
              result.width === input.prepared.width &&
              result.height === input.prepared.height))));
    if (!providerShapeIsValid) {
      await adapter.remove(result).catch(() => undefined);
      throw new AppError(
        httpStatus.BAD_GATEWAY,
        "Storage returned inconsistent media metadata"
      );
    }

    if (input.prepared.access === "public") {
      if (!result.public_url) {
        await adapter.remove(result).catch(() => undefined);
        throw new AppError(
          httpStatus.BAD_GATEWAY,
          "Storage did not return a public delivery URL"
        );
      }
      assertAllowedProviderUrl({
        provider: result.provider === "gcp" ? "gcs" : "cloudinary",
        url: result.public_url,
        bucket: result.bucket,
        cloud_name: result.cloud_name || ENV.cloudinary_cloud_name,
      });
    }

    return { ...result, immutable_key: immutableKey };
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(httpStatus.BAD_GATEWAY, "Managed media upload failed");
  }
};

const getStorageDeleteInput = (file: TFile) => {
  const storageKey =
    file.metadata?.storage_key || file.metadata?.public_id || file.filename;
  if (
    !storageKey ||
    (file.provider !== "gcs" && file.provider !== "cloudinary")
  ) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Managed media storage metadata is incomplete"
    );
  }
  return {
    provider:
      file.provider === "gcs" ? ("gcp" as const) : ("cloudinary" as const),
    storage_key: storageKey,
    bucket: file.metadata?.bucket,
    resource_type:
      file.metadata?.resource_type ||
      (file.mimetype === "application/pdf" ? "raw" : "image"),
    delivery_type: file.metadata?.delivery_type,
  };
};

export const removeManagedMediaObject = async (file: TFile): Promise<void> => {
  if (file.provider === "local") {
    throw new AppError(
      httpStatus.CONFLICT,
      "Legacy local files require the legacy cleanup path"
    );
  }
  await deleteCloudStorageObject(getStorageDeleteInput(file));
};

export const createManagedMediaDelivery = async (input: {
  file: TFile;
  expires_in_seconds?: number;
}): Promise<{ url: string; expires_at: Date | null }> => {
  const file = input.file;
  if (
    file.is_deleted ||
    file.lifecycle_state !== "ready" ||
    !file.purpose ||
    !file.access
  ) {
    throw new AppError(httpStatus.NOT_FOUND, "Media is not available");
  }
  if (file.provider === "local") {
    if (file.access !== "public" || !file.url.startsWith("/uploads/")) {
      throw new AppError(httpStatus.CONFLICT, "Legacy media cannot be signed");
    }
    return { url: file.url, expires_at: null };
  }

  const ttl = clampPrivateDeliveryTtl(input.expires_in_seconds ?? 300);
  const policy = getManagedMediaPurposePolicy(file.purpose);
  const storageInput = getStorageDeleteInput(file);
  const url = await getCloudStorageDeliveryUrl({
    ...storageInput,
    access: file.access,
    public_url: file.access === "public" ? file.url : undefined,
    filename: normalizeMediaFilename(file.originalname),
    expires_in_seconds: ttl,
    disposition: policy.delivery,
    cloud_name: file.metadata?.cloud_name,
  });
  assertAllowedProviderUrl({
    provider: file.provider,
    url,
    bucket: file.metadata?.bucket,
    cloud_name: file.metadata?.cloud_name || ENV.cloudinary_cloud_name,
    allow_search: file.access === "private",
  });
  return {
    url,
    expires_at:
      file.access === "private" ? new Date(Date.now() + ttl * 1000) : null,
  };
};

export const getManagedMediaFailureCode = (
  operation: "upload" | "delete" | "delivery"
): string => getSafeStorageErrorCode(operation);

export type TManagedStorageScanTarget = {
  provider: "cloudinary" | "gcp";
  bucket?: string;
  prefix: string;
};

export const getManagedStorageScanTargets = (): TManagedStorageScanTarget[] => {
  const targets: TManagedStorageScanTarget[] = [];
  if (
    ENV.cloudinary_cloud_name &&
    ENV.cloudinary_api_key &&
    ENV.cloudinary_api_secret
  ) {
    const folder = ENV.cloudinary_folder?.replace(/^\/+|\/+$/g, "");
    targets.push({
      provider: "cloudinary",
      prefix: [folder, "v1/"].filter(Boolean).join("/"),
    });
  }
  const buckets = new Set(
    [ENV.gcp_public_bucket_name, ENV.gcp_private_bucket_name].filter(
      (value): value is string => Boolean(value)
    )
  );
  for (const bucket of buckets) {
    targets.push({ provider: "gcp", bucket, prefix: "v1/" });
  }
  return targets;
};

export const listManagedMediaObjects = async (input: {
  target: TManagedStorageScanTarget;
  older_than: Date;
  limit: number;
}): Promise<TStoredObject[]> =>
  await listCloudStorageManagedObjects(input.target.provider, {
    bucket: input.target.bucket,
    prefix: input.target.prefix,
    older_than: input.older_than,
    limit: input.limit,
  });

export const removeUntrackedManagedMediaObject = async (
  object: TStoredObject
): Promise<void> => await deleteCloudStorageObject(object);

export const toStoredFileProvider = (
  provider: TStorageResult["provider"]
): Extract<TFileProvider, "gcs" | "cloudinary"> =>
  provider === "gcp" ? "gcs" : "cloudinary";

export const getStorageResourceType = (
  mimetype: string
): TCloudinaryResourceType =>
  mimetype === "application/pdf" ? "raw" : "image";
