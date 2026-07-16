import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import type { TJwtPayload } from "@/types/jsonwebtoken.type";
import { createHash, randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import httpStatus from "http-status";
import { Types, type ClientSession } from "mongoose";
import * as FileRepository from "./file.repository";
import { assessFileMetadata } from "./file.metadata";
import type {
  TFile,
  TFileInput,
  TFilePurpose,
  TFileReferenceModel,
} from "./file.type";
import {
  createManagedMediaDelivery,
  getManagedStorageScanTargets,
  getManagedMediaFailureCode,
  listManagedMediaObjects,
  removeManagedMediaObject,
  removeUntrackedManagedMediaObject,
  toStoredFileProvider,
  uploadPreparedMedia,
  type TPreparedManagedMedia,
} from "./managed-media.service";

const PERMANENT_DELETE_LEASE_MS = 60_000;
const FAILED_INGESTION_GRACE_MS = 60 * 60_000;

const assertFilesAreUnreferenced = (files: TFile[]): void => {
  const referenced = files.filter((file) => file.references?.length);
  if (!referenced.length) return;

  throw new AppError(
    httpStatus.CONFLICT,
    `Cannot delete referenced file(s): ${referenced.map((file) => file._id?.toString()).join(", ")}`
  );
};

const getFileAuthorId = (file: TFile): string => {
  const author = file.author as unknown;
  if (author && typeof author === "object" && "_id" in author) {
    return String((author as { _id: unknown })._id);
  }
  return String(author);
};

const canManageFile = (actor: TJwtPayload, file: TFile): boolean =>
  ["super-admin", "admin", "editor"].includes(actor.role || "") ||
  getFileAuthorId(file) === actor._id;

const assertCanManageFile = (actor: TJwtPayload, file: TFile): void => {
  if (!canManageFile(actor, file)) {
    throw new AppError(httpStatus.FORBIDDEN, "File management access denied");
  }
};

export type TManagedMediaCandidate = TPreparedManagedMedia & {
  field_name: string;
  storage: { bucket?: string; folder?: string };
};

export type TManagedFilePersistenceResult = Readonly<{
  file: TFile;
  disposition: "created" | "reused";
}>;

const getStoredIdempotencyKey = (
  key: string | undefined,
  index: number
): string | undefined =>
  key
    ? `v1:${createHash("sha256").update(`${key}\0${index}`).digest("hex")}`
    : undefined;

const stripOperationalFields = (file: TFile): TFile => {
  const result = { ...file };
  delete result.idempotency_key;
  delete result.deletion_lease_token;
  delete result.deletion_lease_expires_at;
  delete result.deletion_attempts;
  delete result.storage_error_code;
  if (result.provenance) {
    result.provenance = { ...result.provenance };
    delete result.provenance.prompt;
    delete result.provenance.seed;
  }
  return result;
};

const buildUploadingFile = (input: {
  user: TJwtPayload;
  prepared: TManagedMediaCandidate;
  payload: TFileInput;
  storage: Awaited<ReturnType<typeof uploadPreparedMedia>>;
  idempotency_key?: string;
}): Partial<TFile> => {
  const file: Partial<TFile> = {
    name: input.payload.name || input.prepared.original_name,
    originalname: input.prepared.original_name,
    filename: input.storage.filename,
    url:
      input.prepared.access === "public" ? input.storage.public_url || "" : "",
    mimetype: input.prepared.mimetype,
    size: input.prepared.size,
    author: new Types.ObjectId(input.user._id),
    provider: toStoredFileProvider(input.storage.provider),
    category: input.payload.category,
    description: input.payload.description,
    caption: input.payload.caption,
    alt_text: input.payload.alt_text,
    is_decorative: input.payload.is_decorative,
    focal_point: input.payload.focal_point,
    dominant_color: input.payload.dominant_color,
    blur_data_url: input.payload.blur_data_url,
    status: input.payload.status || "active",
    lifecycle_state: "uploading",
    purpose: input.prepared.purpose,
    access: input.prepared.access,
    source: input.payload.source || "uploaded",
    provenance: input.payload.provenance,
    attribution: input.payload.attribution,
    checksum: input.prepared.checksum,
    idempotency_key: input.idempotency_key,
    storage_version: 1,
    is_deleted: false,
    metadata: {
      bucket: input.storage.bucket,
      storage_key: input.storage.storage_key,
      public_id: input.storage.public_id,
      asset_id: input.storage.asset_id,
      cloud_name: input.storage.cloud_name,
      folder: input.storage.folder,
      resource_type: input.storage.resource_type,
      delivery_type: input.storage.delivery_type,
      format: input.prepared.extension,
      version: input.storage.version,
      etag: input.storage.etag,
      width: input.prepared.width,
      height: input.prepared.height,
      extension: input.prepared.extension,
      file_type: input.prepared.file_type,
      immutable_key: input.storage.immutable_key,
      checksum_algorithm: "sha256",
      canonicalized_at: new Date(),
    },
  };
  return { ...file, ...assessFileMetadata(file) };
};

const persistPreparedMedia = async (input: {
  user: TJwtPayload;
  prepared: TManagedMediaCandidate;
  payload: TFileInput;
  index: number;
}): Promise<TManagedFilePersistenceResult> => {
  const storedIdempotencyKey = getStoredIdempotencyKey(
    input.payload.idempotency_key,
    input.index
  );
  if (storedIdempotencyKey) {
    const existing = await FileRepository.findReadyByIdempotencyKey({
      author: input.user._id,
      idempotency_key: storedIdempotencyKey,
    });
    if (existing) {
      if (
        existing.checksum !== input.prepared.checksum ||
        existing.purpose !== input.prepared.purpose ||
        (existing.source &&
          existing.source !== (input.payload.source || "uploaded"))
      ) {
        throw new AppError(
          httpStatus.CONFLICT,
          "The upload idempotency key was already used for different media"
        );
      }
      return {
        file: stripOperationalFields(existing),
        disposition: "reused",
      };
    }
  }

  const duplicate = await FileRepository.findReadyDuplicate({
    author: input.user._id,
    checksum: input.prepared.checksum,
    purpose: input.prepared.purpose,
    access: input.prepared.access,
  });
  if (duplicate) {
    if (
      duplicate.source &&
      duplicate.source !== (input.payload.source || "uploaded")
    ) {
      throw new AppError(
        httpStatus.CONFLICT,
        "Matching media already exists with a different source classification"
      );
    }
    return {
      file: stripOperationalFields(duplicate),
      disposition: "reused",
    };
  }

  const storage = await uploadPreparedMedia({
    prepared: input.prepared,
    owner_id: input.user._id,
    ingestion_scope: createHash("sha256")
      .update(storedIdempotencyKey || randomUUID())
      .digest("hex")
      .slice(0, 16),
    field_name: input.prepared.field_name,
    storage: input.prepared.storage,
  });
  const data = buildUploadingFile({
    user: input.user,
    prepared: input.prepared,
    payload: input.payload,
    storage,
    idempotency_key: storedIdempotencyKey,
  });

  const db = await connectDB();
  const session = await db.startSession();
  let created: TFile | undefined;
  try {
    await session.withTransaction(
      async () => {
        created = await FileRepository.createUploading(data, session);
      },
      {
        readConcern: { level: "snapshot" },
        writeConcern: { w: "majority" },
      }
    );
  } catch {
    await removeManagedMediaObject(data as TFile).catch(() => undefined);
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Media metadata could not be committed; the staged upload was compensated"
    );
  } finally {
    await session.endSession();
  }

  if (!created?._id) {
    await removeManagedMediaObject(data as TFile).catch(() => undefined);
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Media metadata could not be committed"
    );
  }

  const id = created._id.toString();
  try {
    const ready = await FileRepository.finalizeUploadingById(id);
    if (!ready) throw new Error("finalization rejected");
    return {
      file: stripOperationalFields(ready),
      disposition: "created",
    };
  } catch {
    let compensated = false;
    try {
      await removeManagedMediaObject(created);
      compensated = true;
    } catch {
      // The durable record remains `orphaned` for the reconciler.
    }
    await FileRepository.markIngestionFailure({
      id,
      state: compensated ? "error" : "orphaned",
      error_code: compensated
        ? "FINALIZE_COMPENSATED"
        : getManagedMediaFailureCode("delete"),
    }).catch(() => false);
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Media finalization failed; cleanup was scheduled"
    );
  }
};

/**
 * Internal ingestion result used by workflows that must compensate only
 * provider objects created by their own call. The disposition is decided in
 * the same service branch that creates or reuses the File; callers never infer
 * ownership with a follow-up read.
 */
export const createManagedFilesWithDisposition = async (
  user: TJwtPayload,
  preparedMedia: TManagedMediaCandidate[],
  payload: TFileInput
): Promise<TManagedFilePersistenceResult[]> => {
  await connectDB();
  if (!preparedMedia.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "No validated media was provided"
    );
  }

  const results: TManagedFilePersistenceResult[] = [];
  for (const [index, prepared] of preparedMedia.entries()) {
    results.push(
      await persistPreparedMedia({ user, prepared, payload, index })
    );
  }
  return results;
};

/** Keep the existing controller/API result shape backward compatible. */
export const createManagedFiles = async (
  user: TJwtPayload,
  preparedMedia: TManagedMediaCandidate[],
  payload: TFileInput
): Promise<TFile[]> =>
  (await createManagedFilesWithDisposition(user, preparedMedia, payload)).map(
    ({ file }) => file
  );

export const getFile = async (
  id: string,
  actor: TJwtPayload
): Promise<TFile> => {
  await connectDB();

  const result = await FileRepository.findById(id);
  if (!result) {
    throw new AppError(httpStatus.NOT_FOUND, "File not found");
  }
  if (result.access === "private" && !canManageFile(actor, result)) {
    throw new AppError(httpStatus.FORBIDDEN, "Private file access denied");
  }

  return result;
};

export const getFiles = async (query: Record<string, unknown>) => {
  await connectDB();

  const typeValue = query.file_type || query.type;
  if (typeValue) {
    query["metadata.file_type"] = typeValue;
    delete query.file_type;
    delete query.type;
  }

  return await FileRepository.findPaginated(query);
};

export const getSelfFiles = async (
  user: TJwtPayload,
  query: Record<string, unknown>
) => {
  await connectDB();

  const typeValue = query.file_type || query.type;
  if (typeValue) {
    query["metadata.file_type"] = typeValue;
    delete query.file_type;
    delete query.type;
  }

  return await FileRepository.findPaginated(query, { author: user._id });
};

export const updateFile = async (
  actor: TJwtPayload,
  id: string,
  payload: Partial<
    Pick<
      TFile,
      | "name"
      | "description"
      | "category"
      | "caption"
      | "status"
      | "source"
      | "alt_text"
      | "is_decorative"
      | "focal_point"
      | "dominant_color"
      | "blur_data_url"
      | "provenance"
      | "attribution"
    >
  >
): Promise<TFile> => {
  await connectDB();

  const exists = await FileRepository.findByIdLean(id);
  if (!exists) {
    throw new AppError(httpStatus.NOT_FOUND, "File not found");
  }
  assertCanManageFile(actor, exists);

  const current =
    (await FileRepository.findByIdWithSensitiveProvenance(id)) || exists;
  const mergedPayload = {
    ...payload,
    ...(payload.provenance
      ? { provenance: { ...current.provenance, ...payload.provenance } }
      : {}),
    ...(payload.attribution
      ? { attribution: { ...current.attribution, ...payload.attribution } }
      : {}),
  };
  const health = assessFileMetadata({ ...current, ...mergedPayload });
  const result = await FileRepository.updateById(id, {
    ...mergedPayload,
    ...health,
  });
  return result!;
};

export const updateFiles = async (
  ids: string[],
  payload: Partial<Pick<TFile, "status">>
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const files = await FileRepository.findManyByIds(ids);
  const foundIds = files.map((file) => file._id!.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await FileRepository.updateManyByIds(foundIds, payload);

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteFile = async (
  actor: TJwtPayload,
  id: string
): Promise<void> => {
  await connectDB();

  const file = await FileRepository.findById(id);
  if (!file) {
    throw new AppError(httpStatus.NOT_FOUND, "File not found");
  }
  assertCanManageFile(actor, file);

  assertFilesAreUnreferenced([file]);
  const deleted = await FileRepository.softDeleteByIdIfUnreferenced(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      "File was referenced while deletion was in progress"
    );
  }
};

export const deleteFiles = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const files = await FileRepository.findManyByIds(ids);
  const foundIds = files.map((file) => file._id!.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  assertFilesAreUnreferenced(files);
  const result = await FileRepository.softDeleteManyByIds(foundIds);
  if (result.modifiedCount !== foundIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      "One or more files were referenced while deletion was in progress"
    );
  }

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

const removePhysicalFile = async (file: TFile): Promise<void> => {
  if (file.provider === "local") {
    if (!file.metadata?.path || !file.metadata.path.startsWith("/uploads/")) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Invalid local storage path for file ${file.filename}`
      );
    }

    const relativePath = file.metadata.path.replace(/^\/+/, "");
    const uploadsRoot = path.resolve(process.cwd(), "public", "uploads");
    const fullPath = path.resolve(process.cwd(), "public", relativePath);
    if (!fullPath.startsWith(`${uploadsRoot}${path.sep}`)) {
      throw new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        `Unsafe local storage path for file ${file.filename}`
      );
    }
    try {
      await unlink(fullPath);
    } catch (error: unknown) {
      if ((error as { code?: string }).code !== "ENOENT") {
        throw new AppError(
          httpStatus.BAD_GATEWAY,
          `Failed to delete local file ${file.filename}`
        );
      }
    }
    return;
  }

  if (file.provider === "gcs" || file.provider === "cloudinary") {
    await removeManagedMediaObject(file);
  }
};

const permanentlyDeleteClaimedFile = async (file: TFile): Promise<void> => {
  const id = file._id!.toString();
  const token = randomUUID();
  const now = new Date();
  const claimed = await FileRepository.claimDeletedForPermanentDelete({
    id,
    token,
    now,
    lease_expires_at: new Date(now.getTime() + PERMANENT_DELETE_LEASE_MS),
  });

  if (!claimed) {
    throw new AppError(
      httpStatus.CONFLICT,
      "File is referenced or another permanent deletion is in progress"
    );
  }

  try {
    await removePhysicalFile(claimed);
  } catch {
    await FileRepository.releasePermanentDeleteClaim({
      id,
      token,
      error_code: "STORAGE_DELETE_FAILED",
    }).catch(() => false);
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Storage asset deletion failed; the file remains available for a safe retry"
    );
  }

  let deleted: TFile | null;
  try {
    deleted = await FileRepository.hardDeleteClaimedById({ id, token });
  } catch {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Storage was deleted but database finalization is pending; retry after the deletion lease expires"
    );
  }

  if (!deleted) {
    await FileRepository.releasePermanentDeleteClaim({
      id,
      token,
      error_code: "DATABASE_FINALIZE_FAILED",
    }).catch(() => false);
    throw new AppError(
      httpStatus.CONFLICT,
      "File deletion could not be finalized safely"
    );
  }
};

export const deleteFilePermanent = async (id: string): Promise<void> => {
  await connectDB();

  const file = await FileRepository.findDeletedById(id);
  if (!file) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Soft-deleted file not found; soft delete it before permanent deletion"
    );
  }

  assertFilesAreUnreferenced([file]);
  await permanentlyDeleteClaimedFile(file);
};

export const deleteFilesPermanent = async (
  ids: string[]
): Promise<{
  count: number;
  not_found_ids: string[];
  failed_ids: string[];
}> => {
  await connectDB();

  const files = await FileRepository.findManyDeletedByIds(ids);
  const foundIds = files.map((file) => file._id!.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const failedIds = files
    .filter((file) => file.references?.length)
    .map((file) => file._id!.toString());
  let count = 0;

  for (const file of files) {
    const id = file._id!.toString();
    if (failedIds.includes(id)) continue;

    try {
      await permanentlyDeleteClaimedFile(file);
      count += 1;
    } catch {
      failedIds.push(id);
    }
  }

  return {
    count,
    not_found_ids: notFoundIds,
    failed_ids: failedIds,
  };
};

export const restoreFile = async (id: string): Promise<TFile> => {
  await connectDB();

  const deletedFile = await FileRepository.findDeletedById(id);
  if (!deletedFile) {
    throw new AppError(httpStatus.NOT_FOUND, "File not found or not deleted");
  }
  if (deletedFile.lifecycle_state && deletedFile.lifecycle_state !== "ready") {
    throw new AppError(
      httpStatus.CONFLICT,
      "File is not safely restorable; finish or retry permanent deletion"
    );
  }

  const file = await FileRepository.restoreById(id);
  if (!file) {
    throw new AppError(httpStatus.NOT_FOUND, "File not found or not deleted");
  }

  return file;
};

export const restoreFiles = async (
  ids: string[]
): Promise<{
  count: number;
  succeeded_ids: string[];
  not_found_ids: string[];
  state_conflict_ids: string[];
}> => {
  await connectDB();

  const [deletedFiles, activeFiles] = await Promise.all([
    FileRepository.findManyDeletedByIds(ids),
    FileRepository.findManyByIds(ids),
  ]);
  const deletedIds = new Set(deletedFiles.map((file) => file._id!.toString()));
  const activeIds = new Set(activeFiles.map((file) => file._id!.toString()));
  const restorableIds = deletedFiles
    .filter((file) => !file.lifecycle_state || file.lifecycle_state === "ready")
    .map((file) => file._id!.toString());
  const restorableSet = new Set(restorableIds);
  const stateConflictIds = ids.filter(
    (id) => activeIds.has(id) || (deletedIds.has(id) && !restorableSet.has(id))
  );
  const notFoundIds = ids.filter(
    (id) => !deletedIds.has(id) && !activeIds.has(id)
  );
  const outcomes = await Promise.all(
    restorableIds.map(async (id) => ({
      id,
      restored: Boolean(await FileRepository.restoreById(id)),
    }))
  );
  const succeededIds = outcomes
    .filter(({ restored }) => restored)
    .map(({ id }) => id);
  stateConflictIds.push(
    ...outcomes.filter(({ restored }) => !restored).map(({ id }) => id)
  );

  return {
    count: succeededIds.length,
    succeeded_ids: succeededIds,
    not_found_ids: notFoundIds,
    state_conflict_ids: [...new Set(stateConflictIds)],
  };
};

// ─── Entity Attachment Helpers ───────────────────────────────────────────────

const normalizeIds = (input?: string | string[] | null): string[] => {
  if (!input) return [];
  return Array.isArray(input) ? input.filter(Boolean) : [input];
};

export const validateFileIds = async (
  ids: string[],
  expectedPurposes: readonly TFilePurpose[] = ["generic"],
  actor?: TJwtPayload,
  session?: ClientSession
): Promise<void> => {
  await connectDB();

  if (!ids.length) return;

  const privileged = ["super-admin", "admin", "editor"].includes(
    actor?.role || ""
  );
  const found = await FileRepository.findAttachableByIds(
    ids,
    expectedPurposes,
    actor && !privileged ? actor._id : undefined,
    session
  );
  const foundIds = new Set(found.map((f) => f._id!.toString()));
  const missing = ids.filter((id) => !foundIds.has(id));

  if (missing.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `File ID(s) are unavailable or incompatible: ${missing.join(", ")}`
    );
  }
};

export const getReferencePurposes = (
  model: TFileReferenceModel,
  field: string
): readonly TFilePurpose[] => {
  const isDocumentField =
    /(?:^|_)(?:attachment|document|evidence|proof)(?:_|$)/.test(field);
  if (model === "Article") return ["article"];
  if (model === "Project") return ["project"];
  if (model === "User" && field === "image") return ["profile"];
  if (model === "ArticleCategory") return ["article"];
  if (model === "ProjectCategory") return ["project"];
  if (model === "Site") {
    if (["logo", "favicon"].includes(field)) return ["logo"];
    if (["hero_visual", "pillar_visual"].includes(field)) return ["hero"];
    if (["identity_visual", "profile_visual"].includes(field)) {
      return ["profile"];
    }
    if (["social_image", "seo_image"].includes(field)) return ["social"];
    if (field === "resume") return ["resume"];
    if (isDocumentField) return ["document"];
    return ["page"];
  }
  if (model === "Page") {
    if (field === "hero_visual") return ["hero"];
    if (field === "seo_image") return ["social"];
    if (isDocumentField) return ["document"];
    return ["page"];
  }
  if (model === "Service") return isDocumentField ? ["document"] : ["service"];
  if (model === "Skill" || model === "SkillGroup") {
    return isDocumentField ? ["document"] : ["skill"];
  }
  if (model === "TimelineEntry") {
    return isDocumentField ? ["document"] : ["timeline"];
  }
  if (model === "Credential") return ["credential", "document"];
  if (model === "Testimonial") {
    return isDocumentField ? ["testimonial", "document"] : ["testimonial"];
  }
  if (model === "LegalDocument") return ["document"];
  if (model === "FAQ") return ["page"];
  return ["generic"];
};

export const attachToEntity = async (params: {
  fileIds: string | string[] | null | undefined;
  model: TFileReferenceModel;
  entity: string;
  field: string;
  actor?: TJwtPayload;
  session?: ClientSession;
}): Promise<void> => {
  await connectDB();

  const ids = normalizeIds(params.fileIds);
  if (!ids.length) return;

  const expectedPurposes = getReferencePurposes(params.model, params.field);
  await validateFileIds(ids, expectedPurposes, params.actor, params.session);
  const privileged = ["super-admin", "admin", "editor"].includes(
    params.actor?.role || ""
  );

  const failedIds = await FileRepository.attachReferences(
    ids,
    {
      model: params.model,
      entity: params.entity,
      field: params.field,
      expected_purposes: expectedPurposes,
      authorized_author:
        params.actor && !privileged ? params.actor._id : undefined,
    },
    params.session
  );
  if (failedIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Cannot attach missing or deleted file(s): ${failedIds.join(", ")}`
    );
  }
};

export const detachFromEntity = async (params: {
  fileIds: string | string[] | null | undefined;
  model: TFileReferenceModel;
  entity: string;
  field?: string;
  session?: ClientSession;
}): Promise<void> => {
  await connectDB();

  const ids = normalizeIds(params.fileIds);
  if (!ids.length) return;

  await FileRepository.detachReferences(
    ids,
    {
      model: params.model,
      entity: params.entity,
      field: params.field,
    },
    params.session
  );
};

export const reconcileEntityRefs = async (params: {
  model: TFileReferenceModel;
  entity: string;
  field: string;
  previous: string | string[] | null | undefined;
  next: string | string[] | null | undefined;
  actor?: TJwtPayload;
  session?: ClientSession;
}): Promise<void> => {
  await connectDB();

  const previousSet = new Set(normalizeIds(params.previous));
  const nextSet = new Set(normalizeIds(params.next));

  const toAttach: string[] = [];
  const toDetach: string[] = [];

  for (const id of nextSet) {
    if (!previousSet.has(id)) toAttach.push(id);
  }
  for (const id of previousSet) {
    if (!nextSet.has(id)) toDetach.push(id);
  }

  if (toAttach.length) {
    const expectedPurposes = getReferencePurposes(params.model, params.field);
    await validateFileIds(
      toAttach,
      expectedPurposes,
      params.actor,
      params.session
    );
    const privileged = ["super-admin", "admin", "editor"].includes(
      params.actor?.role || ""
    );
    const failedIds = await FileRepository.attachReferences(
      toAttach,
      {
        model: params.model,
        entity: params.entity,
        field: params.field,
        expected_purposes: expectedPurposes,
        authorized_author:
          params.actor && !privileged ? params.actor._id : undefined,
      },
      params.session
    );
    if (failedIds.length) {
      await FileRepository.detachReferences(
        toAttach,
        {
          model: params.model,
          entity: params.entity,
          field: params.field,
        },
        params.session
      ).catch(() => undefined);
      throw new AppError(
        httpStatus.CONFLICT,
        `Cannot attach missing or deleted file(s): ${failedIds.join(", ")}`
      );
    }
  }
  if (toDetach.length) {
    await FileRepository.detachReferences(
      toDetach,
      {
        model: params.model,
        entity: params.entity,
        field: params.field,
      },
      params.session
    );
  }
};

export const detachAllForEntity = async (params: {
  model: TFileReferenceModel;
  entity: string;
}): Promise<void> => {
  await connectDB();
  await FileRepository.detachAllForEntity(params);
};

export const getFileDelivery = async (
  id: string,
  actor?: TJwtPayload,
  expiresInSeconds?: number
) => {
  await connectDB();
  const file = await FileRepository.findByIdLean(id);
  if (!file || file.lifecycle_state !== "ready") {
    throw new AppError(httpStatus.NOT_FOUND, "Media is not available");
  }
  if (file.access === "private") {
    const privileged = ["super-admin", "admin", "editor"].includes(
      actor?.role || ""
    );
    if (!actor || (!privileged && getFileAuthorId(file) !== actor._id)) {
      throw new AppError(httpStatus.FORBIDDEN, "Private media access denied");
    }
  }
  return await createManagedMediaDelivery({
    file,
    expires_in_seconds: expiresInSeconds,
  });
};

export const reconcileFailedManagedMedia = async (
  input: {
    limit?: number;
    older_than_ms?: number;
  } = {}
): Promise<{
  failed_records: {
    inspected: number;
    compensated: number;
    failed_ids: string[];
  };
  untracked_objects: {
    inspected: number;
    compensated: number;
    failed_keys: string[];
    target_failures: number;
  };
}> => {
  await connectDB();
  const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 25)));
  const before = new Date(
    Date.now() -
      Math.max(60_000, input.older_than_ms ?? FAILED_INGESTION_GRACE_MS)
  );
  const candidates = await FileRepository.findFailedIngestionCandidates({
    before,
    limit,
  });
  let compensated = 0;
  const failedIds: string[] = [];
  for (const file of candidates) {
    const id = file._id!.toString();
    try {
      await removePhysicalFile(file);
      const marked = await FileRepository.markFailedIngestionCleaned(id);
      if (!marked) throw new Error("cleanup state changed");
      compensated += 1;
    } catch {
      failedIds.push(id);
    }
  }
  let untrackedInspected = 0;
  let untrackedCompensated = 0;
  let targetFailures = 0;
  const failedKeys: string[] = [];
  for (const target of getManagedStorageScanTargets()) {
    let objects;
    try {
      objects = await listManagedMediaObjects({
        target,
        older_than: before,
        limit,
      });
    } catch {
      targetFailures += 1;
      continue;
    }
    untrackedInspected += objects.length;
    const storedProvider =
      target.provider === "gcp" ? ("gcs" as const) : ("cloudinary" as const);
    const existingKeys = new Set(
      await FileRepository.findExistingStorageKeys({
        provider: storedProvider,
        storage_keys: objects.map((object) => object.storage_key),
      })
    );
    for (const object of objects) {
      if (existingKeys.has(object.storage_key)) continue;
      try {
        // Recheck immediately before deletion so a concurrent metadata commit
        // wins over reconciliation.
        if (
          await FileRepository.storageKeyExists({
            provider: storedProvider,
            storage_key: object.storage_key,
          })
        ) {
          continue;
        }
        await removeUntrackedManagedMediaObject(object);
        untrackedCompensated += 1;
      } catch {
        failedKeys.push(
          createHash("sha256")
            .update(object.storage_key)
            .digest("hex")
            .slice(0, 16)
        );
      }
    }
  }

  return {
    failed_records: {
      inspected: candidates.length,
      compensated,
      failed_ids: failedIds,
    },
    untracked_objects: {
      inspected: untrackedInspected,
      compensated: untrackedCompensated,
      failed_keys: failedKeys,
      target_failures: targetFailures,
    },
  };
};
