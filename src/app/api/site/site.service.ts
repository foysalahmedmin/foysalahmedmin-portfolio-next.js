import { appendAuditEvent } from "@/app/api/audit-events/audit-event.service";
import type { TFile, TFilePurpose } from "@/app/api/files/file.type";
import * as FileRepository from "@/app/api/files/file.repository";
import { assertAllowedProviderUrl } from "@/app/api/files/managed-media.policy";
import connectDB from "@/lib/db";
import type { TRole } from "@/types/jsonwebtoken.type";
import type { ClientSession } from "mongoose";
import { invalidatePublishedSiteCache } from "./site.cache";
import {
  assertSitePublishable,
  collectSiteFileReferences,
  createEmergencyPublicSite,
  createNeutralSiteDraft,
  getSitePublishIssues,
  SiteDomainError,
  toPublicSiteMedia,
  uniqueSiteFileIds,
} from "./site.policy";
import * as SiteRepository from "./site.repository";
import {
  type TPublicSiteDto,
  type TPublicSiteMediaDto,
  type TSite,
  type TSiteAdminDto,
  type TSiteDraftSnapshot,
  type TSiteFileReferenceDescriptor,
  type TSiteLink,
  type TSitePublishedSnapshot,
} from "./site.type";
import { siteDraftSnapshotSchema } from "./site.validation";

export type TSiteMutationActor = Readonly<{
  id: string;
  role: TRole;
  session_id: string;
}>;

export type TSiteMutationContext = Readonly<{
  actor: TSiteMutationActor;
  request_id: string;
}>;

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  "code" in error &&
  (error as { code?: unknown }).code === 11000;

const toIsoString = (value: Date | string): string =>
  new Date(value).toISOString();

const draftFromPublished = (
  snapshot: TSitePublishedSnapshot
): TSiteDraftSnapshot => {
  const {
    revision: _revision,
    published_at: _publishedAt,
    published_by: _publishedBy,
    ...draft
  } = snapshot;
  return siteDraftSnapshotSchema.parse(draft);
};

const toAdminDto = (site: TSite): TSiteAdminDto => ({
  site_key: site.site_key,
  schema_version: site.schema_version,
  contract_version: site.contract_version,
  revision: site.revision,
  draft: siteDraftSnapshotSchema.parse(site.draft),
  published: site.published
    ? {
        ...draftFromPublished(site.published),
        revision: site.published.revision,
        published_at: toIsoString(site.published.published_at),
        published_by: site.published.published_by.toString(),
      }
    : null,
  updated_at: toIsoString(site.updated_at),
});

const changedSnapshotFields = (
  previous: TSiteDraftSnapshot,
  next: TSiteDraftSnapshot
): string[] =>
  (Object.keys(next) as Array<keyof TSiteDraftSnapshot>)
    .filter(
      (field) => JSON.stringify(previous[field]) !== JSON.stringify(next[field])
    )
    .map(String);

const actorAuditInput = (actor: TSiteMutationActor) => ({
  type: "user" as const,
  id: actor.id,
  role: actor.role,
  session_id: actor.session_id,
});

const hasAllowedPublicDelivery = (file: TFile): boolean => {
  if (file.provider !== "gcs" && file.provider !== "cloudinary") return false;
  try {
    assertAllowedProviderUrl({
      provider: file.provider,
      url: file.url,
      bucket: file.metadata?.bucket,
      cloud_name: file.metadata?.cloud_name,
    });
    return true;
  } catch {
    return false;
  }
};

const assertFileDescriptor = async (
  descriptor: TSiteFileReferenceDescriptor,
  session: ClientSession,
  requirePublicComplete: boolean
): Promise<TFile | null> => {
  const [file] = await FileRepository.findAttachableByIds(
    [descriptor.id],
    descriptor.purposes,
    undefined,
    session
  );
  if (!file) return null;
  if (
    requirePublicComplete &&
    (file.access !== "public" ||
      file.metadata_status !== "complete" ||
      file.lifecycle_state !== "ready" ||
      file.status !== "active" ||
      !file.url ||
      !hasAllowedPublicDelivery(file))
  ) {
    return null;
  }
  return file;
};

const validateFileGraph = async (
  snapshot: TSiteDraftSnapshot,
  session: ClientSession,
  requirePublicComplete: boolean
): Promise<void> => {
  const unavailable: string[] = [];
  for (const descriptor of collectSiteFileReferences(snapshot)) {
    if (
      !(await assertFileDescriptor(descriptor, session, requirePublicComplete))
    ) {
      unavailable.push(descriptor.field);
    }
  }

  if (unavailable.length) {
    throw new SiteDomainError({
      status: 422,
      code: requirePublicComplete
        ? "SITE_PUBLISH_GRAPH_INVALID"
        : "SITE_FILE_REFERENCE_INVALID",
      message: requirePublicComplete
        ? "The Site cannot be published until every referenced File is public, complete, ready, active, and purpose-compatible."
        : "One or more Site File references are unavailable or incompatible.",
      sources: unavailable,
    });
  }
};

const reconcileFileReferences = async (input: {
  site_id: string;
  previous: TSiteDraftSnapshot | null;
  next: TSiteDraftSnapshot;
  field: "draft" | "published";
  session: ClientSession;
}): Promise<void> => {
  const previousIds = new Set(
    input.previous ? uniqueSiteFileIds(input.previous) : []
  );
  const descriptors = collectSiteFileReferences(input.next);
  const descriptorById = new Map<string, { purposes: Set<TFilePurpose> }>();

  for (const descriptor of descriptors) {
    const current = descriptorById.get(descriptor.id) ?? {
      purposes: new Set<TFilePurpose>(),
    };
    descriptor.purposes.forEach((purpose) => current.purposes.add(purpose));
    descriptorById.set(descriptor.id, current);
  }

  for (const [id, descriptor] of descriptorById) {
    const attached = await FileRepository.attachReference(
      id,
      {
        model: "Site",
        entity: input.site_id,
        field: input.field,
        expected_purposes: [...descriptor.purposes],
      },
      input.session
    );
    if (!attached) {
      throw new SiteDomainError({
        status: 409,
        code: "SITE_FILE_REFERENCE_CHANGED",
        message: "A referenced File changed while the Site was being saved.",
        sources: descriptors
          .filter((candidate) => candidate.id === id)
          .map((candidate) => candidate.field),
      });
    }
  }

  const nextIds = new Set(descriptorById.keys());
  const removed = [...previousIds].filter((id) => !nextIds.has(id));
  await FileRepository.detachReferences(
    removed,
    { model: "Site", entity: input.site_id, field: input.field },
    input.session
  );
};

const versionConflict = async (
  session: ClientSession,
  code = "SITE_VERSION_CONFLICT"
): Promise<SiteDomainError> =>
  new SiteDomainError({
    status: 409,
    code,
    message: "The Site changed. Refresh it before saving again.",
    current_revision: (await SiteRepository.findRevision(session)) ?? undefined,
  });

export const getAdminSite = async (): Promise<TSiteAdminDto> => {
  await connectDB();
  const site = await SiteRepository.findAdmin();
  if (!site) {
    throw new SiteDomainError({
      status: 404,
      code: "SITE_NOT_FOUND",
      message: "Site settings have not been created.",
    });
  }
  return toAdminDto(site);
};

export const createSite = async (
  context: TSiteMutationContext
): Promise<TSiteAdminDto> => {
  const db = await connectDB();
  const session = await db.startSession();
  let created: TSite | undefined;

  try {
    await session.withTransaction(async () => {
      const draft = siteDraftSnapshotSchema.parse(createNeutralSiteDraft());
      created = await SiteRepository.createSingleton(
        {
          draft,
          created_by: context.actor.id,
          updated_by: context.actor.id,
        },
        session
      );
      await appendAuditEvent(
        {
          action: "site.settings.updated",
          actor: actorAuditInput(context.actor),
          target: {
            type: "site",
            id: created._id.toString(),
            revision: created.revision,
          },
          source: "admin",
          summary_code: "site_created",
          changed_fields: ["draft"],
          metadata: {
            http_method: "POST",
            request_channel: "browser",
            content_type: "site",
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
      throw new SiteDomainError({
        status: 409,
        code: "SITE_ALREADY_EXISTS",
        message: "Site settings already exist.",
      });
    }
    throw error;
  } finally {
    await session.endSession();
  }

  if (!created) throw new Error("SITE_CREATE_TRANSACTION_EMPTY");
  return toAdminDto(created);
};

export const updateSiteDraft = async (
  input: { expected_revision: number; draft: TSiteDraftSnapshot },
  context: TSiteMutationContext
): Promise<TSiteAdminDto> => {
  const draft = siteDraftSnapshotSchema.parse(input.draft);
  const db = await connectDB();
  const session = await db.startSession();
  let updated: TSite | undefined;

  try {
    await session.withTransaction(async () => {
      const current = await SiteRepository.findAdmin(session);
      if (!current) {
        throw new SiteDomainError({
          status: 404,
          code: "SITE_NOT_FOUND",
          message: "Site settings have not been created.",
        });
      }
      if (current.revision !== input.expected_revision) {
        throw await versionConflict(session);
      }

      await validateFileGraph(draft, session, false);
      updated =
        (await SiteRepository.updateDraftConditional({
          expected_revision: input.expected_revision,
          draft,
          updated_by: context.actor.id,
          session,
        })) ?? undefined;
      if (!updated) throw await versionConflict(session);

      await reconcileFileReferences({
        site_id: updated._id.toString(),
        previous: siteDraftSnapshotSchema.parse(current.draft),
        next: draft,
        field: "draft",
        session,
      });
      await appendAuditEvent(
        {
          action: "site.settings.updated",
          actor: actorAuditInput(context.actor),
          target: {
            type: "site",
            id: updated._id.toString(),
            revision: updated.revision,
          },
          source: "admin",
          summary_code: "site_draft_updated",
          changed_fields: changedSnapshotFields(current.draft, draft),
          metadata: {
            http_method: "PATCH",
            request_channel: "browser",
            content_type: "site",
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

  if (!updated) throw new Error("SITE_UPDATE_TRANSACTION_EMPTY");
  return toAdminDto(updated);
};

const deliverCacheInvalidation = async (
  siteId: string,
  revision: number,
  correlationId: string
): Promise<boolean> => {
  try {
    await invalidatePublishedSiteCache();
    await SiteRepository.markCacheInvalidationDelivered(siteId, revision);
    return true;
  } catch {
    try {
      await SiteRepository.markCacheInvalidationFailed(siteId, revision);
    } catch {
      // The committed snapshot remains valid; the durable intent is retained.
    }
    console.error("site_cache_invalidation_failed", {
      site_revision: revision,
      correlation_id: correlationId,
      error_code: "framework_invalidation_failed",
    });
    return false;
  }
};

export const retryPendingSiteCacheInvalidations = async (
  limit = 10
): Promise<{ attempted: number; delivered: number }> => {
  await connectDB();
  const pending = await SiteRepository.findPendingCacheInvalidations(
    new Date(),
    limit
  );
  let delivered = 0;
  for (const intent of pending) {
    if (
      await deliverCacheInvalidation(
        intent.site,
        intent.revision,
        intent.correlation_id
      )
    ) {
      delivered += 1;
    }
  }
  return { attempted: pending.length, delivered };
};

export const publishSite = async (
  input: { expected_revision: number },
  context: TSiteMutationContext
): Promise<{ site: TSiteAdminDto; cache_invalidated: boolean }> => {
  const db = await connectDB();
  const session = await db.startSession();
  let published: TSite | undefined;

  try {
    await session.withTransaction(async () => {
      const current = await SiteRepository.findAdmin(session);
      if (!current) {
        throw new SiteDomainError({
          status: 404,
          code: "SITE_NOT_FOUND",
          message: "Site settings have not been created.",
        });
      }
      if (current.revision !== input.expected_revision) {
        throw await versionConflict(session);
      }
      if (current.published?.revision === input.expected_revision) {
        throw await versionConflict(session, "SITE_ALREADY_PUBLISHED");
      }

      const draft = siteDraftSnapshotSchema.parse(current.draft);
      assertSitePublishable(draft);
      await validateFileGraph(draft, session, true);
      const snapshot: TSitePublishedSnapshot = {
        ...draft,
        revision: input.expected_revision,
        published_at: new Date(),
        published_by: context.actor.id,
      };

      published =
        (await SiteRepository.publishConditional({
          expected_revision: input.expected_revision,
          published: snapshot,
          updated_by: context.actor.id,
          session,
        })) ?? undefined;
      if (!published) throw await versionConflict(session);

      const previousPublished = current.published
        ? draftFromPublished(current.published)
        : null;
      await reconcileFileReferences({
        site_id: published._id.toString(),
        previous: previousPublished,
        next: draft,
        field: "published",
        session,
      });
      await SiteRepository.createCacheInvalidationIntent({
        site: published._id.toString(),
        revision: input.expected_revision,
        correlation_id: context.request_id,
        session,
      });
      await appendAuditEvent(
        {
          action: "site.settings.updated",
          actor: actorAuditInput(context.actor),
          target: {
            type: "site",
            id: published._id.toString(),
            revision: input.expected_revision,
          },
          source: "admin",
          summary_code: "site_published",
          changed_fields: ["published"],
          metadata: {
            http_method: "POST",
            request_channel: "browser",
            content_type: "site",
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

  if (!published) throw new Error("SITE_PUBLISH_TRANSACTION_EMPTY");
  const cacheInvalidated = await deliverCacheInvalidation(
    published._id.toString(),
    input.expected_revision,
    context.request_id
  );
  return {
    site: toAdminDto(published),
    cache_invalidated: cacheInvalidated,
  };
};

const fileMapFrom = (files: readonly TFile[]): Map<string, TFile> =>
  new Map(
    files.flatMap((file) =>
      file._id ? [[file._id.toString(), file] as const] : []
    )
  );

const isCompletePublicFile = (
  file: TFile | undefined,
  purposes: readonly TFilePurpose[]
): file is TFile =>
  Boolean(
    file &&
      file.access === "public" &&
      file.status === "active" &&
      file.lifecycle_state === "ready" &&
      file.metadata_status === "complete" &&
      file.url &&
      hasAllowedPublicDelivery(file) &&
      file.purpose &&
      purposes.includes(file.purpose)
  );

const publicLink = (
  link: TSiteLink,
  draft: TSiteDraftSnapshot,
  resume: TPublicSiteMediaDto | undefined
): TSiteLink | null => {
  if (!link.enabled) return null;
  if (link.kind === "email") {
    return draft.contact.email_visibility === "public" &&
      draft.contact.public_email
      ? { ...link, href: `mailto:${draft.contact.public_email}` }
      : null;
  }
  if (link.kind === "phone") {
    return draft.contact.phone_visibility === "public" &&
      draft.contact.public_phone
      ? { ...link, href: `tel:${draft.contact.public_phone}` }
      : null;
  }
  if (link.kind === "resume") {
    return resume ? { ...link, href: resume.url } : null;
  }
  return link;
};

const publicLinks = (
  links: readonly TSiteLink[],
  draft: TSiteDraftSnapshot,
  resume: TPublicSiteMediaDto | undefined
): TSiteLink[] =>
  links.flatMap((link) => {
    const mapped = publicLink(link, draft, resume);
    return mapped ? [mapped] : [];
  });

const toPublicDto = (
  site: TSite,
  draft: TSiteDraftSnapshot,
  files: Map<string, TFile>
): TPublicSiteDto => {
  const media = (id: string | undefined) =>
    id ? toPublicSiteMedia(files.get(id)) : undefined;
  const resume = media(draft.brand.resume_file);

  return {
    content_source: "published",
    site_key: site.site_key,
    schema_version: site.schema_version,
    contract_version: site.contract_version,
    published_revision: site.published?.revision,
    published_at: site.published
      ? toIsoString(site.published.published_at)
      : undefined,
    identity: draft.identity,
    positioning: draft.positioning,
    pillars: draft.pillars.map((pillar) => {
      const { visual_file: visualFile, ...publicPillar } = pillar;
      return {
        ...publicPillar,
        cta: pillar.cta
          ? (publicLink(pillar.cta, draft, resume) ?? undefined)
          : undefined,
        visual: media(visualFile),
      };
    }),
    brand: {
      logo_light: media(draft.brand.logo_light_file),
      logo_dark: media(draft.brand.logo_dark_file),
      favicon: media(draft.brand.favicon_file),
      profile: media(draft.brand.profile_file),
      resume,
    },
    contact: {
      availability: draft.experience.feature_flags.show_availability
        ? draft.contact.availability
        : "unknown",
      map_policy: draft.contact.map_policy,
      ...(draft.contact.map_policy === "city_only" && draft.contact.location
        ? { location: draft.contact.location }
        : {}),
      ...(draft.experience.feature_flags.show_availability &&
      draft.contact.availability_label
        ? { availability_label: draft.contact.availability_label }
        : {}),
      ...(draft.contact.response_promise
        ? { response_promise: draft.contact.response_promise }
        : {}),
      ...(draft.contact.email_visibility === "public" &&
      draft.contact.public_email
        ? { public_email: draft.contact.public_email }
        : {}),
      ...(draft.contact.phone_visibility === "public" &&
      draft.contact.public_phone
        ? { public_phone: draft.contact.public_phone }
        : {}),
    },
    navigation: {
      header: publicLinks(draft.navigation.header, draft, resume),
      footer: publicLinks(draft.navigation.footer, draft, resume),
      legal: publicLinks(draft.navigation.legal, draft, resume),
    },
    social_links: draft.social_links.filter((link) => link.enabled),
    primary_ctas: publicLinks(draft.primary_ctas, draft, resume),
    footer: draft.footer,
    seo: {
      default_title: draft.seo.default_title,
      title_template: draft.seo.title_template,
      default_description: draft.seo.default_description,
      canonical_url: draft.seo.canonical_url,
      allow_indexing: draft.seo.allow_indexing,
      default_og: media(draft.seo.default_og_file),
    },
    experience: draft.experience,
    fallbacks: {
      emergency_visual_key: draft.fallbacks.emergency_visual_key,
      project: media(draft.fallbacks.project_file),
      article: media(draft.fallbacks.article_file),
      profile: media(draft.fallbacks.profile_file),
    },
    process: draft.process.filter((step) => step.enabled),
    metrics: draft.experience.feature_flags.show_metrics
      ? draft.metrics.filter(
          (metric) => metric.enabled && metric.verification !== "unverified"
        )
      : [],
  };
};

export const readPublishedSiteUncached = async (): Promise<TPublicSiteDto> => {
  await connectDB();
  const site = await SiteRepository.findPublished();
  if (!site?.published) return createEmergencyPublicSite();

  const publishedDraft = (() => {
    const {
      revision: _revision,
      published_at: _publishedAt,
      published_by: _publishedBy,
      ...draft
    } = site.published;
    return draft;
  })();
  const parsed = siteDraftSnapshotSchema.safeParse(publishedDraft);
  if (!parsed.success || getSitePublishIssues(parsed.data).length) {
    console.error("site_published_snapshot_invalid", {
      error_code: "published_contract_invalid",
    });
    return createEmergencyPublicSite();
  }

  const descriptors = collectSiteFileReferences(parsed.data);
  const files = fileMapFrom(
    await FileRepository.findManyByIds(uniqueSiteFileIds(parsed.data))
  );
  const graphIsComplete = descriptors.every((descriptor) =>
    isCompletePublicFile(files.get(descriptor.id), descriptor.purposes)
  );
  if (!graphIsComplete) {
    console.error("site_published_snapshot_invalid", {
      error_code: "published_file_graph_invalid",
    });
    return createEmergencyPublicSite();
  }

  return toPublicDto(site, parsed.data, files);
};
