import { appendAuditEvent } from "@/app/api/audit-events/audit-event.service";
import connectDB from "@/lib/db";
import { unstable_cache } from "next/cache";
import {
  invalidatePublishedPageCache,
  PAGE_CACHE_TAG,
  pageCacheTag,
} from "./page.cache";
import { validatePageGraph } from "./page.graph";
import {
  assertPagePublishStructure,
  changedPageFields,
  PageDomainError,
  reorderPageSections,
} from "./page.policy";
import * as PageRepository from "./page.repository";
import {
  PAGE_ROUTE_PATHS,
  type TPage,
  type TPageAdminDto,
  type TPageDraftSnapshot,
  type TPageMutationContext,
  type TPagePublishedSnapshot,
  type TPageRouteKey,
  type TPublicPageDto,
  type TPublicPageSection,
} from "./page.type";
import { parsePageDraftSnapshot } from "./page.validation";

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === 11000;

const iso = (value: Date | string): string => new Date(value).toISOString();

const publishedDraft = (
  routeKey: TPageRouteKey,
  published: TPagePublishedSnapshot
): TPageDraftSnapshot => {
  const {
    revision: _revision,
    published_at: _publishedAt,
    published_by: _publishedBy,
    ...draft
  } = published;
  return parsePageDraftSnapshot(routeKey, draft);
};

const toAdminDto = (page: TPage): TPageAdminDto => ({
  id: page._id.toString(),
  route_key: page.route_key,
  route_path: PAGE_ROUTE_PATHS[page.route_key],
  locale: "en",
  schema_version: 1,
  contract_version: 1,
  revision: page.revision,
  draft: parsePageDraftSnapshot(page.route_key, page.draft),
  published: page.published
    ? {
        ...publishedDraft(page.route_key, page.published),
        revision: page.published.revision,
        published_at: iso(page.published.published_at),
        published_by: page.published.published_by.toString(),
      }
    : null,
  updated_at: iso(page.updated_at),
});

const auditActor = (context: TPageMutationContext) => ({
  type: "user" as const,
  id: context.actor.id,
  role: context.actor.role,
  session_id: context.actor.session_id,
});

const conflict = async (
  routeKey: TPageRouteKey,
  code = "PAGE_VERSION_CONFLICT"
): Promise<PageDomainError> =>
  new PageDomainError({
    status: 409,
    code,
    message: "The Page changed. Refresh it before saving again.",
    current_revision:
      (await PageRepository.findPageRevision(routeKey)) ?? undefined,
  });

export const getAdminPage = async (
  routeKey: TPageRouteKey
): Promise<TPageAdminDto> => {
  await connectDB();
  const page = await PageRepository.findAdminPage(routeKey);
  if (!page) {
    throw new PageDomainError({
      status: 404,
      code: "PAGE_NOT_FOUND",
      message: "This fixed-route Page has not been created.",
    });
  }
  return toAdminDto(page);
};

export const createPage = async (
  routeKey: TPageRouteKey,
  draftInput: unknown,
  context: TPageMutationContext
): Promise<TPageAdminDto> => {
  const draft = parsePageDraftSnapshot(routeKey, draftInput);
  const db = await connectDB();
  const session = await db.startSession();
  let created: TPage | undefined;
  try {
    await session.withTransaction(async () => {
      await validatePageGraph({
        route_key: routeKey,
        snapshot: draft,
        mode: "draft",
        session,
      });
      created = await PageRepository.createPage(
        { route_key: routeKey, draft, actor_id: context.actor.id },
        session
      );
      await appendAuditEvent(
        {
          action: "page.created",
          actor: auditActor(context),
          target: { type: "page", id: created._id.toString(), revision: 1 },
          source: "admin",
          summary_code: "page_created",
          changed_fields: ["draft"],
          metadata: {
            http_method: "POST",
            request_channel: "browser",
            content_type: "page",
            next_state: "draft",
            transactional: true,
          },
          correlation_id: context.request_id,
        },
        { session }
      );
    });
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new PageDomainError({
        status: 409,
        code: "PAGE_ALREADY_EXISTS",
        message: "This fixed-route Page already exists.",
      });
    }
    throw error;
  } finally {
    await session.endSession();
  }
  if (!created) throw new Error("PAGE_CREATE_TRANSACTION_EMPTY");
  return toAdminDto(created);
};

const saveDraft = async (
  routeKey: TPageRouteKey,
  input: { expected_revision: number; draft: TPageDraftSnapshot },
  context: TPageMutationContext
): Promise<TPageAdminDto> => {
  const db = await connectDB();
  const session = await db.startSession();
  let updated: TPage | undefined;
  try {
    await session.withTransaction(async () => {
      const current = await PageRepository.findAdminPage(routeKey, session);
      if (!current) {
        throw new PageDomainError({
          status: 404,
          code: "PAGE_NOT_FOUND",
          message: "Page not found.",
        });
      }
      if (current.revision !== input.expected_revision)
        throw await conflict(routeKey);
      await validatePageGraph({
        route_key: routeKey,
        snapshot: input.draft,
        mode: "draft",
        session,
      });
      updated =
        (await PageRepository.updateDraftConditional({
          route_key: routeKey,
          expected_revision: input.expected_revision,
          draft: input.draft,
          actor_id: context.actor.id,
          session,
        })) ?? undefined;
      if (!updated) throw await conflict(routeKey);
      await appendAuditEvent(
        {
          action: "page.draft.updated",
          actor: auditActor(context),
          target: {
            type: "page",
            id: updated._id.toString(),
            revision: updated.revision,
          },
          source: "admin",
          summary_code: "page_draft_updated",
          changed_fields: changedPageFields(current.draft, input.draft),
          metadata: {
            http_method: "PATCH",
            request_channel: "browser",
            content_type: "page",
            previous_state: "draft",
            next_state: "draft",
            transactional: true,
          },
          correlation_id: context.request_id,
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
  if (!updated) throw new Error("PAGE_UPDATE_TRANSACTION_EMPTY");
  return toAdminDto(updated);
};

export const updatePageDraft = async (
  routeKey: TPageRouteKey,
  input: { expected_revision: number; draft: unknown },
  context: TPageMutationContext
): Promise<TPageAdminDto> =>
  saveDraft(
    routeKey,
    {
      expected_revision: input.expected_revision,
      draft: parsePageDraftSnapshot(routeKey, input.draft),
    },
    context
  );

export const reorderPageDraft = async (
  routeKey: TPageRouteKey,
  input: { expected_revision: number; ordered_section_keys: readonly string[] },
  context: TPageMutationContext
): Promise<TPageAdminDto> => {
  await connectDB();
  const current = await PageRepository.findAdminPage(routeKey);
  if (!current) {
    throw new PageDomainError({
      status: 404,
      code: "PAGE_NOT_FOUND",
      message: "Page not found.",
    });
  }
  if (current.revision !== input.expected_revision)
    throw await conflict(routeKey);
  return saveDraft(
    routeKey,
    {
      expected_revision: input.expected_revision,
      draft: reorderPageSections(
        parsePageDraftSnapshot(routeKey, current.draft),
        input.ordered_section_keys
      ),
    },
    context
  );
};

const deliverCacheInvalidation = async (
  pageId: string,
  routeKey: TPageRouteKey,
  revision: number,
  correlationId: string
): Promise<boolean> => {
  try {
    await invalidatePublishedPageCache(routeKey);
    await PageRepository.markCacheInvalidationDelivered(pageId, revision);
    return true;
  } catch {
    try {
      await PageRepository.markCacheInvalidationFailed(pageId, revision);
    } catch {
      // The committed snapshot remains authoritative; the durable intent remains pending.
    }
    console.error("page_cache_invalidation_failed", {
      route_key: routeKey,
      page_revision: revision,
      correlation_id: correlationId,
      error_code: "framework_invalidation_failed",
    });
    return false;
  }
};

export const publishPage = async (
  routeKey: TPageRouteKey,
  input: { expected_revision: number },
  context: TPageMutationContext
): Promise<{ page: TPageAdminDto; cache_invalidated: boolean }> => {
  const db = await connectDB();
  const session = await db.startSession();
  let published: TPage | undefined;
  try {
    await session.withTransaction(async () => {
      const current = await PageRepository.findAdminPage(routeKey, session);
      if (!current) {
        throw new PageDomainError({
          status: 404,
          code: "PAGE_NOT_FOUND",
          message: "Page not found.",
        });
      }
      if (current.revision !== input.expected_revision)
        throw await conflict(routeKey);
      if (current.published?.revision === input.expected_revision) {
        throw await conflict(routeKey, "PAGE_ALREADY_PUBLISHED");
      }
      const draft = parsePageDraftSnapshot(routeKey, current.draft);
      assertPagePublishStructure(routeKey, draft);
      await validatePageGraph({
        route_key: routeKey,
        snapshot: draft,
        mode: "publish",
        session,
      });
      const snapshot: TPagePublishedSnapshot = {
        ...draft,
        revision: input.expected_revision,
        published_at: new Date(),
        published_by: context.actor.id,
      };
      published =
        (await PageRepository.publishConditional({
          route_key: routeKey,
          expected_revision: input.expected_revision,
          published: snapshot,
          actor_id: context.actor.id,
          session,
        })) ?? undefined;
      if (!published) throw await conflict(routeKey);
      await PageRepository.createCacheInvalidationIntent({
        page: published._id.toString(),
        route_key: routeKey,
        revision: input.expected_revision,
        correlation_id: context.request_id,
        session,
      });
      await appendAuditEvent(
        {
          action: "page.published",
          actor: auditActor(context),
          target: {
            type: "page",
            id: published._id.toString(),
            revision: input.expected_revision,
          },
          source: "admin",
          summary_code: "page_published",
          changed_fields: ["published"],
          metadata: {
            http_method: "POST",
            request_channel: "browser",
            content_type: "page",
            previous_state: current.published ? "published" : "absent",
            next_state: "published",
            transactional: true,
          },
          correlation_id: context.request_id,
        },
        { session }
      );
    });
  } finally {
    await session.endSession();
  }
  if (!published) throw new Error("PAGE_PUBLISH_TRANSACTION_EMPTY");
  const cacheInvalidated = await deliverCacheInvalidation(
    published._id.toString(),
    routeKey,
    input.expected_revision,
    context.request_id
  );
  return { page: toAdminDto(published), cache_invalidated: cacheInvalidated };
};

export const retryPendingPageCacheInvalidations = async (
  limit = 10
): Promise<{ attempted: number; delivered: number }> => {
  await connectDB();
  const pending = await PageRepository.findPendingCacheInvalidations(
    new Date(),
    limit
  );
  let delivered = 0;
  for (const intent of pending) {
    if (
      await deliverCacheInvalidation(
        intent.page,
        intent.route_key,
        intent.revision,
        intent.correlation_id
      )
    )
      delivered += 1;
  }
  return { attempted: pending.length, delivered };
};

export const readPublishedPageUncached = async (
  routeKey: TPageRouteKey
): Promise<TPublicPageDto> => {
  await connectDB();
  const page = await PageRepository.findPublishedPage(routeKey);
  if (!page?.published) {
    throw new PageDomainError({
      status: 404,
      code: "PAGE_NOT_PUBLISHED",
      message: "Page not found.",
    });
  }
  const draft = publishedDraft(routeKey, page.published);
  const graph = await validatePageGraph({
    route_key: routeKey,
    snapshot: draft,
    mode: "publish",
  });
  const sections: TPublicPageSection[] = draft.sections
    .filter((section) => section.visible)
    .map((section) => ({
      ...section,
      source:
        section.source.mode === "curated"
          ? {
              mode: "curated" as const,
              references: graph.references_by_section.get(section.key) ?? [],
            }
          : section.source,
    }));
  return {
    route_key: routeKey,
    route_path: PAGE_ROUTE_PATHS[routeKey],
    locale: "en",
    schema_version: 1,
    contract_version: 1,
    published_revision: page.published.revision,
    published_at: iso(page.published.published_at),
    seo: draft.seo,
    sections,
  };
};

export const readPublishedPage = async (
  routeKey: TPageRouteKey
): Promise<TPublicPageDto> =>
  unstable_cache(
    () => readPublishedPageUncached(routeKey),
    ["portfolio", "page", routeKey, "published"],
    {
      tags: [PAGE_CACHE_TAG, pageCacheTag(routeKey)],
      revalidate: 3600,
    }
  )();

export const readDraftPreview = async (
  routeKey: TPageRouteKey,
  expectedPageId: string,
  expectedRevision: number
): Promise<TPageAdminDto> => {
  await connectDB();
  const page = await PageRepository.findAdminPage(routeKey);
  if (
    !page ||
    page._id.toString() !== expectedPageId ||
    page.revision !== expectedRevision
  ) {
    throw new PageDomainError({
      status: 409,
      code: "PAGE_PREVIEW_STALE",
      message: "The preview session is stale. Create a new preview session.",
    });
  }
  await validatePageGraph({
    route_key: routeKey,
    snapshot: page.draft,
    mode: "draft",
  });
  return toAdminDto(page);
};

export const auditPagePreviewCreated = async (
  page: TPageAdminDto,
  context: TPageMutationContext
): Promise<void> => {
  await appendAuditEvent({
    action: "page.preview.created",
    actor: auditActor(context),
    target: { type: "page", id: page.id, revision: page.revision },
    source: "admin",
    summary_code: "page_preview_created",
    changed_fields: [],
    metadata: {
      http_method: "POST",
      request_channel: "browser",
      content_type: "page",
      next_state: "preview",
      transactional: false,
    },
    correlation_id: context.request_id,
  });
};
