import connectDB from "@/lib/db";
import { appendSlugSuffix, normalizeSlug } from "@/lib/content/slug";
import { hasCapability } from "@/lib/auth/capabilities";
import type { TJwtPayload, TRole } from "@/types/jsonwebtoken.type";
import { Types, type ClientSession } from "mongoose";
import * as AuditEventService from "../audit-events/audit-event.service";
import type {
  TAuditAction,
  TAuditTargetType,
} from "../audit-events/audit-event.type";
import * as FileService from "../files/file.service";
import {
  createCachedPublicReader,
  createInvalidationIntent,
} from "./record.cache";
import { ContentRecordError, versionConflict } from "./record.error";
import type { TRecordRepository } from "./record.repository";
import type {
  TCacheInvalidationRef,
  TMutationResult,
  TRepeatableBulkOperation,
  TRepeatableDefinition,
  TRepeatableListQuery,
} from "./record.type";
import { buildRepeatableSearchText } from "./record.model";
import {
  bulkRecordsSchema,
  normalizeCommonInput,
  recordOperationSchema,
  reorderRecordsSchema,
} from "./record.validation";

type Actor = TJwtPayload & { session_id?: string };

const getActor = (actor: Actor) => {
  if (!actor?._id || !actor.role) {
    throw new ContentRecordError({
      status: 403,
      code: "CONTENT_ACCESS_DENIED",
      message: "Content access is not permitted.",
    });
  }
  return {
    type: "user" as const,
    id: actor._id,
    role: actor.role as TRole,
    ...(actor.session_id ? { session_id: actor.session_id } : {}),
  };
};

const assertCanPublish = (actor: Actor): void => {
  if (!hasCapability(actor.role, "content:publish")) {
    throw new ContentRecordError({
      status: 403,
      code: "CONTENT_PUBLISH_DENIED",
      message: "Publishing content is not permitted.",
    });
  }
};

const changedFields = (payload: Record<string, unknown>): string[] =>
  Object.keys(payload)
    .filter((key) => key !== "expected_version" && key !== "search_text")
    .sort()
    .slice(0, 40);

const getAuditAction = (
  previousStatus: unknown,
  nextStatus: unknown
): TAuditAction => {
  if (nextStatus === "published" && previousStatus !== "published") {
    return "content.published";
  }
  if (previousStatus === "published" && nextStatus === "draft") {
    return "content.unpublished";
  }
  if (nextStatus === "archived" && previousStatus !== "archived") {
    return "content.archived";
  }
  return "content.updated";
};

const collectFileIds = (
  record: Readonly<Record<string, unknown>>,
  field: string
): string[] => {
  const value = record[field];
  if (!value) return [];
  const values = Array.isArray(value) ? value : [value];
  return values
    .map((item) => {
      if (typeof item === "string") return item;
      if (item && typeof item === "object") {
        const id = (item as { _id?: unknown })._id ?? item;
        return String(id);
      }
      return "";
    })
    .filter(Boolean);
};

const assertDomainValid = async (
  definition: TRepeatableDefinition,
  record: Readonly<Record<string, unknown>>
): Promise<void> => {
  try {
    await new definition.model(record).validate();
  } catch {
    throw new ContentRecordError({
      status: 422,
      code: "RECORD_VALIDATION_FAILED",
      message: "The record violates its domain contract.",
      sources: [
        {
          path: "record",
          message: "Review the record's related fields and lifecycle state.",
        },
      ],
    });
  }
};

const assertPublishable = async (
  definition: TRepeatableDefinition,
  record: Readonly<Record<string, unknown>>,
  session?: ClientSession
): Promise<void> => {
  const issues = new Set(definition.get_publish_issues(record));
  for (const issue of (await definition.get_async_publish_issues?.(
    record,
    session
  )) ?? []) {
    issues.add(issue);
  }
  if (record.claim_verification === "unverified") {
    issues.add("claim_verification");
  }
  if (!record.title) issues.add("title");
  if (!record.slug) issues.add("slug");
  if (issues.size) {
    throw new ContentRecordError({
      status: 422,
      code: "RECORD_NOT_PUBLISHABLE",
      message: "The record is incomplete or unverified for publication.",
      sources: [...issues].slice(0, 50).map((path) => ({
        path,
        message: "Complete or verify this field before publication.",
      })),
    });
  }
};

const appendAudit = async (input: {
  definition: TRepeatableDefinition;
  action: TAuditAction;
  actor: Actor;
  target: string;
  version: number;
  changed_fields?: readonly string[];
  session: ClientSession;
}) =>
  await AuditEventService.appendAuditEvent(
    {
      action: input.action,
      actor: getActor(input.actor),
      target: {
        type: input.definition.domain as TAuditTargetType,
        id: input.target,
        revision: input.version,
      },
      source: "admin",
      summary_code: input.action.replaceAll(".", "_"),
      changed_fields: input.changed_fields,
      metadata: {
        content_type: input.definition.domain,
        transactional: true,
      },
    },
    { session: input.session }
  );

const allocateSlug = async (
  repository: TRecordRepository,
  input: { requested: string; title: string; id: string }
): Promise<string> => {
  const base = normalizeSlug(input.requested || input.title, {
    fallback: "content",
  });
  const owner = await repository.findSlugOwner("en", base);
  if (!owner || owner === input.id) return base;
  const suffix = input.id.slice(-8).toLowerCase();
  const candidate = appendSlugSuffix(base, suffix);
  const candidateOwner = await repository.findSlugOwner("en", candidate);
  if (!candidateOwner || candidateOwner === input.id) return candidate;
  for (let counter = 2; counter <= 99; counter += 1) {
    const fallback = appendSlugSuffix(base, `${suffix}-${counter}`);
    const fallbackOwner = await repository.findSlugOwner("en", fallback);
    if (!fallbackOwner || fallbackOwner === input.id) return fallback;
  }
  throw new ContentRecordError({
    status: 409,
    code: "SLUG_CONFLICT",
    message: "A stable slug could not be allocated.",
  });
};

const runTransaction = async <T>(
  callback: (session: ClientSession) => Promise<T>
): Promise<T> => {
  const db = await connectDB();
  const session = await db.startSession();
  try {
    let result: T | undefined;
    await session.withTransaction(async () => {
      result = await callback(session);
    });
    if (result === undefined) {
      throw new ContentRecordError({
        status: 503,
        code: "CONTENT_COMMIT_FAILED",
        message: "The content mutation could not be committed.",
      });
    }
    return result;
  } finally {
    await session.endSession();
  }
};

export const createRecordService = <TPublicDto, TAdminDto>(
  definition: TRepeatableDefinition<any, TPublicDto, TAdminDto>,
  repository: TRecordRepository
) => {
  const cachedPublicList = createCachedPublicReader<
    string,
    {
      data: TPublicDto[];
      meta: { page: number; limit: number; total: number; totalPage: number };
    }
  >({
    cache_key: `${definition.cache_tag}:list`,
    tag: definition.cache_tag,
    reader: async (serializedQuery) => {
      await connectDB();
      const query = JSON.parse(serializedQuery) as TRepeatableListQuery;
      const result = await repository.list(query, "public");
      const eligible = definition.is_public_record_eligible
        ? result.records.filter(definition.is_public_record_eligible)
        : result.records;
      return {
        data: eligible.map(definition.to_public_dto),
        meta: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPage: Math.ceil(result.total / query.limit),
        },
      };
    },
  });
  const cachedPublicDetail = createCachedPublicReader<
    string,
    TPublicDto | null
  >({
    cache_key: `${definition.cache_tag}:detail`,
    tag: definition.cache_tag,
    reader: async (slug) => {
      await connectDB();
      const record = await repository.findPublicBySlug(slug);
      return record &&
        (!definition.is_public_record_eligible ||
          definition.is_public_record_eligible(record))
        ? definition.to_public_dto(record)
        : null;
    },
  });

  const createRecord = async (
    unsafeInput: unknown,
    actor: Actor
  ): Promise<TMutationResult<TAdminDto>> => {
    await connectDB();
    const parsed = normalizeCommonInput(
      definition.create_schema.parse(unsafeInput) as Record<string, unknown>
    );
    const id = new Types.ObjectId().toString();
    const slug = await allocateSlug(repository, {
      requested: String(parsed.slug ?? parsed.title),
      title: String(parsed.title),
      id,
    });
    const candidate: Record<string, unknown> = {
      ...parsed,
      _id: id,
      slug,
      locale: "en",
      contract_version: 1,
      secondary_pillars: parsed.secondary_pillars ?? [],
      status: parsed.status ?? "draft",
      published_at: parsed.status === "published" ? new Date() : null,
      first_published_at: parsed.status === "published" ? new Date() : null,
      is_featured: parsed.is_featured ?? false,
      enabled: parsed.enabled ?? true,
      claim_verification: parsed.claim_verification ?? "not_applicable",
      version: 1,
      created_by: actor._id,
      updated_by: actor._id,
      is_deleted: false,
      deleted_at: null,
    };
    candidate.search_text = buildRepeatableSearchText(
      candidate,
      definition.search_fields
    );
    if (candidate.status === "published") assertCanPublish(actor);
    await assertDomainValid(definition, candidate);
    if (candidate.status === "published") {
      await assertPublishable(definition, candidate);
    }

    for (const field of definition.file_fields) {
      const ids = collectFileIds(candidate, field.field);
      await FileService.validateFileIds(ids, field.purposes, actor);
    }

    return await runTransaction(async (session) => {
      if (candidate.status === "published") {
        await assertPublishable(definition, candidate, session);
      }
      const created = await repository.create(candidate, session);
      for (const field of definition.file_fields) {
        await FileService.attachToEntity({
          fileIds: collectFileIds(created, field.field),
          model: definition.model_name,
          entity: id,
          field: field.field,
          actor,
          session,
        });
      }
      await appendAudit({
        definition,
        action: "content.created",
        actor,
        target: id,
        version: 1,
        changed_fields: changedFields(parsed),
        session,
      });
      if (candidate.status === "published") {
        await appendAudit({
          definition,
          action: "content.published",
          actor,
          target: id,
          version: 1,
          changed_fields: ["status", "published_at"],
          session,
        });
      }
      const invalidation = await createInvalidationIntent({
        domain: definition.domain,
        target: id,
        target_version: 1,
        tag: definition.cache_tag,
        session,
      });
      return {
        data: definition.to_admin_dto(created),
        invalidations: [invalidation],
      };
    });
  };

  const updateRecord = async (
    id: string,
    unsafeInput: unknown,
    actor: Actor
  ): Promise<TMutationResult<TAdminDto>> => {
    await connectDB();
    const parsed = normalizeCommonInput(
      definition.update_schema.parse(unsafeInput) as Record<string, unknown>
    );
    const expectedVersion = Number(parsed.expected_version);
    const existing = await repository.findById(id);
    if (!existing) {
      throw new ContentRecordError({
        status: 404,
        code: "RECORD_NOT_FOUND",
        message: "The content record was not found.",
      });
    }
    if (Number(existing.version) !== expectedVersion) {
      throw versionConflict(Number(existing.version));
    }
    const payload = { ...parsed };
    delete payload.expected_version;
    if (payload.slug && payload.slug !== existing.slug) {
      if (existing.first_published_at) {
        throw new ContentRecordError({
          status: 409,
          code: "STABLE_SLUG_LOCKED",
          message: "A previously published record keeps its stable slug.",
        });
      }
      payload.slug = await allocateSlug(repository, {
        requested: String(payload.slug),
        title: String(payload.title ?? existing.title),
        id,
      });
    }
    const nextStatus = payload.status ?? existing.status;
    if (nextStatus === "published" && existing.status !== "published") {
      payload.published_at = new Date();
      if (!existing.first_published_at) payload.first_published_at = new Date();
    } else if (nextStatus !== "published" && existing.status === "published") {
      payload.published_at = null;
    }
    payload.updated_by = actor._id;
    const candidate = { ...existing, ...payload };
    payload.search_text = buildRepeatableSearchText(
      candidate,
      definition.search_fields
    );
    candidate.search_text = payload.search_text;
    if (nextStatus === "published") assertCanPublish(actor);
    await assertDomainValid(definition, candidate);
    if (nextStatus === "published") {
      await assertPublishable(definition, candidate);
    }

    for (const field of definition.file_fields) {
      if (field.field in payload) {
        await FileService.validateFileIds(
          collectFileIds(payload, field.field),
          field.purposes,
          actor
        );
      }
    }

    return await runTransaction(async (session) => {
      if (nextStatus === "published") {
        await assertPublishable(definition, candidate, session);
      }
      const updated = await repository.updateConditional({
        id,
        expected_version: expectedVersion,
        set: payload,
        session,
      });
      if (!updated) {
        const current = await repository.findById(id, "with_deleted", session);
        throw versionConflict(
          current?.version === undefined ? undefined : Number(current.version)
        );
      }
      for (const field of definition.file_fields) {
        if (field.field in payload) {
          await FileService.reconcileEntityRefs({
            model: definition.model_name,
            entity: id,
            field: field.field,
            previous: collectFileIds(existing, field.field),
            next: collectFileIds(payload, field.field),
            actor,
            session,
          });
        }
      }
      const nextVersion = expectedVersion + 1;
      await appendAudit({
        definition,
        action: getAuditAction(existing.status, nextStatus),
        actor,
        target: id,
        version: nextVersion,
        changed_fields: changedFields(payload),
        session,
      });
      const invalidation = await createInvalidationIntent({
        domain: definition.domain,
        target: id,
        target_version: nextVersion,
        tag: definition.cache_tag,
        session,
      });
      return {
        data: definition.to_admin_dto(updated),
        invalidations: [invalidation],
      };
    });
  };

  const softDeleteRecord = async (
    id: string,
    unsafeInput: unknown,
    actor: Actor
  ): Promise<TMutationResult<{ id: string; version: number }>> => {
    await connectDB();
    const { expected_version: expectedVersion } =
      recordOperationSchema.parse(unsafeInput);
    const existing = await repository.findById(id);
    if (!existing) {
      throw new ContentRecordError({
        status: 404,
        code: "RECORD_NOT_FOUND",
        message: "The content record was not found.",
      });
    }
    if (Number(existing.version) !== expectedVersion) {
      throw versionConflict(Number(existing.version));
    }
    return await runTransaction(async (session) => {
      const updated = await repository.updateConditional({
        id,
        expected_version: expectedVersion,
        set: {
          is_deleted: true,
          deleted_at: new Date(),
          updated_by: actor._id,
        },
        session,
      });
      if (!updated) throw versionConflict();
      const version = expectedVersion + 1;
      await appendAudit({
        definition,
        action: "content.deleted",
        actor,
        target: id,
        version,
        session,
      });
      const invalidation = await createInvalidationIntent({
        domain: definition.domain,
        target: id,
        target_version: version,
        tag: definition.cache_tag,
        session,
      });
      return { data: { id, version }, invalidations: [invalidation] };
    });
  };

  const restoreRecord = async (
    id: string,
    unsafeInput: unknown,
    actor: Actor
  ): Promise<TMutationResult<TAdminDto>> => {
    await connectDB();
    const { expected_version: expectedVersion } =
      recordOperationSchema.parse(unsafeInput);
    const existing = await repository.findById(id, "only_deleted");
    if (!existing) {
      throw new ContentRecordError({
        status: 404,
        code: "RECORD_NOT_FOUND",
        message: "The deleted content record was not found.",
      });
    }
    if (Number(existing.version) !== expectedVersion) {
      throw versionConflict(Number(existing.version));
    }
    const slugOwner = await repository.findSlugOwner(
      "en",
      String(existing.slug)
    );
    if (slugOwner && slugOwner !== id) {
      throw new ContentRecordError({
        status: 409,
        code: "RESTORE_CONFLICT",
        message: "The record slug is already in use.",
      });
    }
    return await runTransaction(async (session) => {
      const updated = await repository.updateConditional({
        id,
        expected_version: expectedVersion,
        set: {
          is_deleted: false,
          deleted_at: null,
          updated_by: actor._id,
        },
        session,
        scope: "only_deleted",
      });
      if (!updated) throw versionConflict();
      const version = expectedVersion + 1;
      await appendAudit({
        definition,
        action: "content.restored",
        actor,
        target: id,
        version,
        session,
      });
      const invalidation = await createInvalidationIntent({
        domain: definition.domain,
        target: id,
        target_version: version,
        tag: definition.cache_tag,
        session,
      });
      return {
        data: definition.to_admin_dto(updated),
        invalidations: [invalidation],
      };
    });
  };

  const permanentlyDeleteRecord = async (
    id: string,
    unsafeInput: unknown,
    actor: Actor
  ): Promise<TMutationResult<{ id: string }>> => {
    await connectDB();
    const { expected_version: expectedVersion } =
      recordOperationSchema.parse(unsafeInput);
    const existing = await repository.findById(id, "only_deleted");
    if (!existing) {
      throw new ContentRecordError({
        status: 404,
        code: "RECORD_NOT_FOUND",
        message: "The deleted content record was not found.",
      });
    }
    if (Number(existing.version) !== expectedVersion) {
      throw versionConflict(Number(existing.version));
    }
    return await runTransaction(async (session) => {
      for (const field of definition.file_fields) {
        await FileService.detachFromEntity({
          fileIds: collectFileIds(existing, field.field),
          model: definition.model_name,
          entity: id,
          field: field.field,
          session,
        });
      }
      const deleted = await repository.permanentDeleteConditional({
        id,
        expected_version: expectedVersion,
        session,
      });
      if (!deleted) throw versionConflict();
      const version = expectedVersion + 1;
      await appendAudit({
        definition,
        action: "content.permanently_deleted",
        actor,
        target: id,
        version,
        session,
      });
      const invalidation = await createInvalidationIntent({
        domain: definition.domain,
        target: id,
        target_version: version,
        tag: definition.cache_tag,
        session,
      });
      return { data: { id }, invalidations: [invalidation] };
    });
  };

  const reorderRecords = async (
    unsafeInput: unknown,
    actor: Actor
  ): Promise<
    TMutationResult<Array<{ id: string; sequence: number; version: number }>>
  > => {
    const { items } = reorderRecordsSchema.parse(unsafeInput);
    return await runTransaction(async (session) => {
      const data: Array<{ id: string; sequence: number; version: number }> = [];
      const invalidations: TCacheInvalidationRef[] = [];
      for (const item of items) {
        const existing = await repository.findById(item.id, "active", session);
        if (!existing) {
          throw new ContentRecordError({
            status: 404,
            code: "RECORD_NOT_FOUND",
            message: "A reorder target was not found.",
          });
        }
        if (Number(existing.version) !== item.expected_version) {
          throw versionConflict(Number(existing.version));
        }
        const updated = await repository.updateConditional({
          id: item.id,
          expected_version: item.expected_version,
          set: { sequence: item.sequence, updated_by: actor._id },
          session,
        });
        if (!updated) throw versionConflict();
        const version = item.expected_version + 1;
        await appendAudit({
          definition,
          action: "content.updated",
          actor,
          target: item.id,
          version,
          changed_fields: ["sequence"],
          session,
        });
        invalidations.push(
          await createInvalidationIntent({
            domain: definition.domain,
            target: item.id,
            target_version: version,
            tag: definition.cache_tag,
            session,
          })
        );
        data.push({ id: item.id, sequence: item.sequence, version });
      }
      return { data, invalidations };
    });
  };

  const bulkRecords = async (
    unsafeInput: unknown,
    actor: Actor
  ): Promise<
    TMutationResult<{
      operation: TRepeatableBulkOperation;
      succeeded: Array<{ id: string; version?: number }>;
      failed: Array<{ id: string; code: string }>;
    }>
  > => {
    const { operation, items } = bulkRecordsSchema.parse(unsafeInput);
    const succeeded: Array<{ id: string; version?: number }> = [];
    const failed: Array<{ id: string; code: string }> = [];
    const invalidations: TCacheInvalidationRef[] = [];
    for (const item of items) {
      try {
        let result: TMutationResult<unknown>;
        if (operation === "soft_delete") {
          result = await softDeleteRecord(item.id, item, actor);
        } else if (operation === "restore") {
          result = await restoreRecord(item.id, item, actor);
        } else {
          const update =
            operation === "publish"
              ? { status: "published" }
              : operation === "archive"
                ? { status: "archived" }
                : operation === "feature"
                  ? { is_featured: true }
                  : { is_featured: false };
          result = await updateRecord(
            item.id,
            { expected_version: item.expected_version, ...update },
            actor
          );
        }
        invalidations.push(...result.invalidations);
        const data = result.data as { version?: number };
        succeeded.push({
          id: item.id,
          ...(data.version ? { version: data.version } : {}),
        });
      } catch (error) {
        failed.push({
          id: item.id,
          code:
            error instanceof ContentRecordError
              ? error.code
              : "CONTENT_MUTATION_FAILED",
        });
      }
    }
    return {
      data: { operation, succeeded, failed },
      invalidations,
    };
  };

  return {
    definition,
    async getPublicList(query: TRepeatableListQuery) {
      return await cachedPublicList(JSON.stringify(query));
    },
    async getPublicBySlug(slug: string) {
      const record = await cachedPublicDetail(slug);
      if (!record) {
        throw new ContentRecordError({
          status: 404,
          code: "RECORD_NOT_FOUND",
          message: "The published content record was not found.",
        });
      }
      return record;
    },
    async getPublicForComposition(input: {
      ids?: readonly string[];
      limit: number;
      filters: Readonly<Record<string, string | boolean>>;
    }) {
      const limit = Math.min(24, Math.max(1, Math.trunc(input.limit)));
      const ids = input.ids
        ? [...new Set(input.ids)].filter((id) => /^[a-f0-9]{24}$/i.test(id))
        : undefined;
      if (input.ids && ids?.length !== input.ids.length) {
        throw new ContentRecordError({
          status: 422,
          code: "CONTENT_COMPOSITION_INPUT_INVALID",
          message: "Page composition references are invalid.",
        });
      }
      await connectDB();
      const records = await repository.findPublicForComposition({
        ...(ids ? { ids } : {}),
        limit,
        filters: input.filters,
      });
      const eligible = definition.is_public_record_eligible
        ? records.filter(definition.is_public_record_eligible)
        : records;
      return eligible.map(definition.to_public_dto);
    },
    async getAdminList(query: TRepeatableListQuery) {
      await connectDB();
      const result = await repository.list(query, "admin");
      return {
        data: result.records.map(definition.to_admin_dto),
        meta: {
          page: query.page,
          limit: query.limit,
          total: result.total,
          totalPage: Math.ceil(result.total / query.limit),
        },
      };
    },
    async getAdminById(id: string) {
      await connectDB();
      const record = await repository.findById(id, "with_deleted");
      if (!record) {
        throw new ContentRecordError({
          status: 404,
          code: "RECORD_NOT_FOUND",
          message: "The content record was not found.",
        });
      }
      return definition.to_admin_dto(record);
    },
    createRecord,
    updateRecord,
    softDeleteRecord,
    restoreRecord,
    permanentlyDeleteRecord,
    reorderRecords,
    bulkRecords,
  };
};

export type TRecordService = ReturnType<typeof createRecordService>;
