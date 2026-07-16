import AppQuery from "@/builder/app-query";
import { parseSoftDeleteScope, setSoftDeleteScope } from "@/lib/db/soft-delete";
import File from "./file.model";
import type { ClientSession } from "mongoose";
import type {
  TFile,
  TFileDocument,
  TFilePurpose,
  TFileReferenceModel,
} from "./file.type";

export const create = async (data: Partial<TFile>): Promise<TFile> => {
  const result = await File.create(data);
  return result.toObject();
};

export const createMany = async (data: Partial<TFile>[]): Promise<TFile[]> => {
  const result = await File.insertMany(data);
  return result.map((item) => item.toObject());
};

export const createUploading = async (
  data: Partial<TFile>,
  session: ClientSession
): Promise<TFile> => {
  const [result] = await File.create([data], { session });
  return result.toObject();
};

export const findReadyByIdempotencyKey = async (params: {
  author: string;
  idempotency_key: string;
}): Promise<TFile | null> =>
  await File.findOne({
    author: params.author,
    idempotency_key: params.idempotency_key,
    lifecycle_state: "ready",
  })
    .select("+idempotency_key")
    .lean();

export const findReadyDuplicate = async (params: {
  author: string;
  checksum: string;
  purpose: TFilePurpose;
  access: "public" | "private";
}): Promise<TFile | null> =>
  await File.findOne({
    author: params.author,
    checksum: params.checksum,
    purpose: params.purpose,
    access: params.access,
    lifecycle_state: "ready",
  }).lean();

export const finalizeUploadingById = async (
  id: string
): Promise<TFile | null> =>
  await File.findOneAndUpdate(
    { _id: id, lifecycle_state: "uploading" },
    {
      $set: { lifecycle_state: "ready", storage_error_code: null },
    },
    { new: true, runValidators: true }
  ).lean();

export const markIngestionFailure = async (params: {
  id: string;
  state: "orphaned" | "error";
  error_code: string;
}): Promise<boolean> => {
  const result = await File.updateOne(
    { _id: params.id, lifecycle_state: { $in: ["uploading", "orphaned"] } },
    {
      $set: {
        lifecycle_state: params.state,
        storage_error_code: params.error_code,
      },
    }
  );
  return result.modifiedCount === 1;
};

export const findFailedIngestionCandidates = async (params: {
  before: Date;
  limit: number;
}): Promise<TFile[]> =>
  await File.find({
    lifecycle_state: { $in: ["uploading", "orphaned", "error"] },
    updated_at: { $lte: params.before },
    "references.0": { $exists: false },
  })
    .sort({ updated_at: 1 })
    .limit(params.limit)
    .lean();

export const markFailedIngestionCleaned = async (
  id: string
): Promise<boolean> => {
  const result = await File.updateOne(
    {
      _id: id,
      lifecycle_state: { $in: ["uploading", "orphaned", "error"] },
      "references.0": { $exists: false },
    },
    {
      $set: {
        lifecycle_state: "error",
        is_deleted: true,
        deleted_at: new Date(),
        storage_error_code: "INGESTION_COMPENSATED",
      },
    }
  );
  return result.modifiedCount === 1;
};

export const findById = async (id: string): Promise<TFileDocument | null> => {
  return await File.findById(id).populate([
    { path: "author", select: "_id name email image" },
  ]);
};

export const findByIdLean = async (id: string): Promise<TFile | null> => {
  return await File.findById(id).lean();
};

export const findByIdWithSensitiveProvenance = async (
  id: string
): Promise<TFile | null> =>
  await File.findById(id).select("+provenance.prompt +provenance.seed").lean();

export const findByIdWithDeleted = async (
  id: string
): Promise<TFile | null> => {
  return await setSoftDeleteScope(File.findById(id), "with_deleted").lean();
};

export const findDeletedById = async (id: string): Promise<TFile | null> => {
  return await setSoftDeleteScope(File.findById(id), "only_deleted").lean();
};

export const findManyByIds = async (ids: string[]): Promise<TFile[]> => {
  return await File.find({ _id: { $in: ids } }).lean();
};

export const findAttachableByIds = async (
  ids: string[],
  expectedPurposes: readonly TFilePurpose[],
  authorizedAuthor?: string,
  session?: ClientSession
): Promise<TFile[]> => {
  const query = File.find({
    _id: { $in: ids },
    lifecycle_state: "ready",
    purpose: { $in: expectedPurposes },
    status: "active",
    ...(authorizedAuthor && { author: authorizedAuthor }),
  });
  if (session) query.session(session);
  return await query.lean();
};

export const findManyDeletedByIds = async (ids: string[]): Promise<TFile[]> => {
  return await setSoftDeleteScope(
    File.find({ _id: { $in: ids } }),
    "only_deleted"
  ).lean();
};

export const findExistingStorageKeys = async (params: {
  provider: "gcs" | "cloudinary";
  storage_keys: string[];
}): Promise<string[]> => {
  if (!params.storage_keys.length) return [];
  const files = await setSoftDeleteScope(
    File.find({
      provider: params.provider,
      "metadata.storage_key": { $in: params.storage_keys },
    }),
    "with_deleted"
  )
    .select("metadata.storage_key")
    .lean();
  return files
    .map((file) => file.metadata?.storage_key)
    .filter((value): value is string => Boolean(value));
};

export const storageKeyExists = async (params: {
  provider: "gcs" | "cloudinary";
  storage_key: string;
}): Promise<boolean> =>
  Boolean(
    await setSoftDeleteScope(
      File.exists({
        provider: params.provider,
        "metadata.storage_key": params.storage_key,
      }),
      "with_deleted"
    )
  );

export const findPaginated = async (
  query: Record<string, unknown>,
  filterOverride: Record<string, unknown> = {}
) => {
  const scope = parseSoftDeleteScope(query.deleted_scope);
  const filterFields = [
    "status",
    "provider",
    "category",
    "lifecycle_state",
    "purpose",
    "access",
    "source",
    "metadata_status",
    "metadata_missing",
    "metadata.file_type",
    ...("author" in filterOverride ? [] : ["author"]),
  ];
  const fileQuery = new AppQuery<TFile>(
    setSoftDeleteScope(File.find({ ...filterOverride }), scope).populate([
      { path: "author", select: "_id name email image" },
    ]),
    query
  );

  return await fileQuery
    .search(["filename", "originalname", "name", "description"])
    .filter(filterFields)
    .sort([
      "name",
      "filename",
      "size",
      "status",
      "lifecycle_state",
      "provider",
      "purpose",
      "access",
      "metadata_status",
      "created_at",
    ])
    .paginate()
    .fields([
      "filename",
      "originalname",
      "name",
      "url",
      "mimetype",
      "size",
      "author",
      "provider",
      "purpose",
      "access",
      "source",
      "checksum",
      "storage_version",
      "category",
      "description",
      "caption",
      "alt_text",
      "is_decorative",
      "focal_point",
      "dominant_color",
      "blur_data_url",
      "status",
      "lifecycle_state",
      "provenance.generator" as keyof TFile,
      "provenance.model" as keyof TFile,
      "provenance.version" as keyof TFile,
      "provenance.generated_at" as keyof TFile,
      "provenance.source_checksum" as keyof TFile,
      "attribution",
      "metadata_status",
      "metadata_missing",
      "metadata",
      "references",
      "created_at",
      "updated_at",
    ])
    .tap((q) =>
      (scope === "active" ? q : q.select("+is_deleted +deleted_at")).lean()
    )
    .execute([
      { key: "active", filter: { status: "active" } },
      { key: "inactive", filter: { status: "inactive" } },
      { key: "archived", filter: { status: "archived" } },
      { key: "local", filter: { provider: "local" } },
      { key: "gcs", filter: { provider: "gcs" } },
      { key: "cloudinary", filter: { provider: "cloudinary" } },
      { key: "ready", filter: { lifecycle_state: "ready" } },
      { key: "metadata_complete", filter: { metadata_status: "complete" } },
      {
        key: "metadata_incomplete",
        filter: { metadata_status: "incomplete" },
      },
      { key: "referenced", filter: { "references.0": { $exists: true } } },
      { key: "unreferenced", filter: { "references.0": { $exists: false } } },
    ]);
};

export const updateById = async (
  id: string,
  payload: Partial<TFile>
): Promise<TFileDocument | null> => {
  return await File.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });
};

export const updateManyByIds = async (
  ids: string[],
  payload: Partial<TFile>
): Promise<{ modifiedCount: number }> => {
  return await File.updateMany({ _id: { $in: ids } }, { ...payload });
};

export const restoreById = async (
  id: string
): Promise<TFileDocument | null> => {
  return await setSoftDeleteScope(
    File.findOneAndUpdate(
      {
        _id: id,
        lifecycle_state: { $in: ["ready", null] },
      },
      {
        is_deleted: false,
        deleted_at: null,
        lifecycle_state: "ready",
        deletion_lease_token: null,
        deletion_lease_expires_at: null,
        storage_error_code: null,
      },
      { new: true }
    ),
    "only_deleted"
  );
};

export const softDeleteByIdIfUnreferenced = async (
  id: string
): Promise<boolean> => {
  const result = await File.updateOne(
    {
      _id: id,
      lifecycle_state: "ready",
      "references.0": { $exists: false },
    },
    { $set: { is_deleted: true, deleted_at: new Date() } }
  );
  return result.modifiedCount === 1;
};

export const softDeleteManyByIds = async (
  ids: string[]
): Promise<{ modifiedCount: number }> => {
  return await File.updateMany(
    {
      _id: { $in: ids },
      lifecycle_state: "ready",
      "references.0": { $exists: false },
    },
    { $set: { is_deleted: true, deleted_at: new Date() } }
  );
};

export const claimDeletedForPermanentDelete = async (params: {
  id: string;
  token: string;
  now: Date;
  lease_expires_at: Date;
}): Promise<TFile | null> => {
  return await setSoftDeleteScope(
    File.findOneAndUpdate(
      {
        _id: params.id,
        "references.0": { $exists: false },
        $or: [
          { lifecycle_state: { $ne: "deleting" } },
          { deletion_lease_expires_at: { $lte: params.now } },
          { deletion_lease_expires_at: null },
        ],
      },
      {
        $set: {
          lifecycle_state: "deleting",
          deletion_lease_token: params.token,
          deletion_lease_expires_at: params.lease_expires_at,
          storage_error_code: null,
        },
        $inc: { deletion_attempts: 1 },
      },
      { new: true }
    ),
    "only_deleted"
  )
    .select(
      "+deletion_lease_token +deletion_lease_expires_at +deletion_attempts +storage_error_code"
    )
    .lean();
};

export const releasePermanentDeleteClaim = async (params: {
  id: string;
  token: string;
  error_code: string;
}): Promise<boolean> => {
  const result = await setSoftDeleteScope(
    File.updateOne(
      { _id: params.id, deletion_lease_token: params.token },
      {
        $set: {
          lifecycle_state: "error",
          deletion_lease_token: null,
          deletion_lease_expires_at: null,
          storage_error_code: params.error_code,
        },
      }
    ),
    "only_deleted"
  );
  return result.modifiedCount === 1;
};

export const hardDeleteClaimedById = async (params: {
  id: string;
  token: string;
}): Promise<TFile | null> => {
  return await setSoftDeleteScope(
    File.findOneAndDelete({
      _id: params.id,
      lifecycle_state: "deleting",
      deletion_lease_token: params.token,
      "references.0": { $exists: false },
    }),
    "only_deleted"
  ).lean();
};

export const attachReference = async (
  fileId: string,
  ref: {
    model: TFileReferenceModel;
    entity: string;
    field: string;
    expected_purposes: readonly TFilePurpose[];
    authorized_author?: string;
  },
  session?: ClientSession
): Promise<boolean> => {
  const result = await File.updateOne(
    {
      _id: fileId,
      lifecycle_state: "ready",
      purpose: { $in: ref.expected_purposes },
      status: "active",
      ...(ref.authorized_author && { author: ref.authorized_author }),
      references: {
        $not: {
          $elemMatch: {
            model: ref.model,
            entity: ref.entity,
            field: ref.field,
          },
        },
      },
    },
    {
      $push: {
        references: {
          model: ref.model,
          entity: ref.entity,
          field: ref.field,
          attached_at: new Date(),
        },
      },
    },
    { session }
  );

  if (result.modifiedCount === 1) return true;

  const alreadyAttachedQuery = File.exists({
    _id: fileId,
    lifecycle_state: "ready",
    purpose: { $in: ref.expected_purposes },
    status: "active",
    ...(ref.authorized_author && { author: ref.authorized_author }),
    references: {
      $elemMatch: {
        model: ref.model,
        entity: ref.entity,
        field: ref.field,
      },
    },
  });
  if (session) alreadyAttachedQuery.session(session);
  const alreadyAttached = await alreadyAttachedQuery;
  return Boolean(alreadyAttached);
};

export const attachReferences = async (
  fileIds: string[],
  ref: {
    model: TFileReferenceModel;
    entity: string;
    field: string;
    expected_purposes: readonly TFilePurpose[];
    authorized_author?: string;
  },
  session?: ClientSession
): Promise<string[]> => {
  if (!fileIds.length) return [];
  const results: Array<{ id: string; attached: boolean }> = [];
  for (const id of fileIds) {
    results.push({ id, attached: await attachReference(id, ref, session) });
  }
  return results.filter(({ attached }) => !attached).map(({ id }) => id);
};

export const detachReference = async (
  fileId: string,
  ref: { model: TFileReferenceModel; entity: string; field?: string },
  session?: ClientSession
): Promise<void> => {
  const query = setSoftDeleteScope(
    File.updateOne(
      { _id: fileId },
      {
        $pull: {
          references: {
            model: ref.model,
            entity: ref.entity,
            ...(ref.field && { field: ref.field }),
          },
        },
      },
      { session }
    ),
    "with_deleted"
  );
  await query;
};

export const detachReferences = async (
  fileIds: string[],
  ref: { model: TFileReferenceModel; entity: string; field?: string },
  session?: ClientSession
): Promise<void> => {
  if (!fileIds.length) return;
  for (const id of fileIds) await detachReference(id, ref, session);
};

export const detachAllForEntity = async (ref: {
  model: TFileReferenceModel;
  entity: string;
}): Promise<void> => {
  await setSoftDeleteScope(
    File.updateMany(
      { "references.entity": ref.entity, "references.model": ref.model },
      { $pull: { references: { model: ref.model, entity: ref.entity } } }
    ),
    "with_deleted"
  );
};

export const findIdsForEntity = async (ref: {
  model: TFileReferenceModel;
  entity: string;
  field?: string;
}): Promise<string[]> => {
  const docs = await File.find({
    references: {
      $elemMatch: {
        model: ref.model,
        entity: ref.entity,
        ...(ref.field && { field: ref.field }),
      },
    },
  })
    .select("_id")
    .lean();

  return docs.map((d) => (d._id as { toString(): string }).toString());
};
