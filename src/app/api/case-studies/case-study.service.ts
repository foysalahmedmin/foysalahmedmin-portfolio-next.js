import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import {
  getCaseStudyPublishReadiness,
  type CaseStudyLinkVisibility,
  type CaseStudyOutcome,
} from "@/lib/content/case-study-contract";
import {
  normalizePillarRelationships,
  type PillarKey,
} from "@/lib/content/pillars";
import type { ProjectType } from "@/lib/content/portfolio-contract";
import {
  createLegacyRichContentDocument,
  sanitizeRichHtml,
} from "@/lib/content/rich-content";
import {
  buildCaseStudyDiscoveryRepositoryQuery,
  normalizeCaseStudyDiscoveryCompositionFilter,
  parseCaseStudyDiscoveryQuery,
} from "@/lib/discovery/case-study-discovery";
import type { TJwtPayload } from "@/types/jsonwebtoken.type";
import { withPublicPagination } from "@/utils/public-query";
import httpStatus from "http-status";
import { Types } from "mongoose";
import * as CaseStudyCategoryRepository from "../case-study-categories/case-study-category.repository";
import {
  allocateContentSlug,
  reserveContentSlug,
} from "../content-slug-aliases/content-slug-alias.service";
import * as FileService from "../files/file.service";
import { toPublicCaseStudyDto } from "../public-content.dto";
import { invalidatePublicContentAfterCommit } from "../public-content-cache/cache-invalidation.service";
import * as CaseStudyRepository from "./case-study.repository";

const MODEL = "CaseStudy" as const;

type TCaseStudyStatusValue = "draft" | "pending" | "published" | "archived";

export type TCaseStudyContentFields = {
  description?: string;
  overview?: string;
  content?: string;
  thumbnail?: string | null;
  images?: string[];
  client_name?: string;
  show_client_name?: boolean;
  client_industry?: string;
  client_location?: string;
  engagement_type?: ProjectType;
  primary_pillar?: PillarKey;
  secondary_pillars?: PillarKey[];
  role?: string;
  team_size?: number;
  duration_label?: string;
  started_at?: Date | string;
  ended_at?: Date | string;
  challenge?: string;
  approach?: string;
  solution?: string;
  key_decisions?: string[];
  results_summary?: string;
  outcomes?: CaseStudyOutcome[];
  tech_stack?: string[];
  services?: string[];
  learnings?: string[];
  keywords?: string[];
  live_url?: string | null;
  live_url_visibility?: CaseStudyLinkVisibility;
  source_url?: string | null;
  source_url_visibility?: CaseStudyLinkVisibility;
  is_featured?: boolean;
  published_at?: Date | string;
  expired_at?: Date | string | null;
  layout?: string;
};

export type TCaseStudyCreatePayload = TCaseStudyContentFields & {
  name: string;
  slug?: string;
  category: string;
  author: string;
  status?: TCaseStudyStatusValue;
};

export type TCaseStudyUpdatePayload = TCaseStudyContentFields &
  Partial<{
    name: string;
    slug: string;
    category: string;
    status: TCaseStudyStatusValue;
  }>;

const invalidatePublishedComposition = async (): Promise<void> => {
  try {
    await invalidatePublicContentAfterCommit("case_study");
  } catch {
    console.error("case_study_public_cache_intent_failed", {
      error_code: "cache_intent_failed",
    });
  }
};

/** Sanitises the optional long-form body; no body is a valid state. */
const prepareBody = (content: string | undefined) => {
  if (content === undefined) return {};
  const sanitized = sanitizeRichHtml(content).trim();
  if (!sanitized) {
    if (!content.trim()) return { content: "", rich_content: undefined };
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Case study content must contain safe readable content"
    );
  }
  return {
    content: sanitized,
    rich_content: createLegacyRichContentDocument(sanitized),
  };
};

const assertActiveCategory = async (categoryId: string): Promise<void> => {
  const category = await CaseStudyCategoryRepository.findById(categoryId);
  if (!category || category.status !== "active") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "An active case study category is required"
    );
  }
};

const assertCaseStudyPublishable = (
  candidate: Parameters<typeof getCaseStudyPublishReadiness>[0]
): void => {
  const missing = getCaseStudyPublishReadiness(candidate);
  if (missing.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Case study is not publishable; complete: ${missing.join(", ")}`
    );
  }
};

const toIdString = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value !== null) {
    const obj = value as { _id?: { toString(): string }; toString?(): string };
    if (obj._id) return obj._id.toString();
    if (obj.toString) return obj.toString();
  }
  return null;
};

const toIdArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value.map((v) => toIdString(v)).filter((v): v is string => Boolean(v));
};

export const getCaseStudies = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  return await CaseStudyRepository.findPaginated(queryParams);
};

export const getPublicCaseStudies = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  const result = await CaseStudyRepository.findPublicPaginated(
    withPublicPagination(queryParams)
  );
  return { ...result, data: result.data.map(toPublicCaseStudyDto) };
};

export const getPublicCaseStudyDiscovery = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  const query = parseCaseStudyDiscoveryQuery(
    queryParams as Record<string, string | number | null | undefined>
  );
  const category =
    query.category === "all"
      ? null
      : await CaseStudyCategoryRepository.findPublicByIdentifierPopulated(
          query.category
        );
  const composition = normalizeCaseStudyDiscoveryCompositionFilter({
    featured: queryParams.composition_featured,
    pillar: queryParams.composition_pillar,
  });
  const result = await CaseStudyRepository.findPublicPaginated(
    buildCaseStudyDiscoveryRepositoryQuery(
      query,
      category?._id?.toString(),
      composition
    )
  );
  return {
    ...result,
    data: result.data
      .filter((record) => record.category && record.author)
      .map(toPublicCaseStudyDto),
    query:
      category?.slug && category.slug !== query.category
        ? { ...query, category: category.slug }
        : query,
  };
};

export const getPublicCaseStudyDiscoveryFacets = async () => {
  await connectDB();
  return CaseStudyRepository.findPublicDiscoveryFacets();
};

export const getCaseStudyById = async (id: string) => {
  await connectDB();

  const caseStudy = await CaseStudyRepository.findByIdPopulated(id);
  if (!caseStudy) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study not found");
  }

  return caseStudy;
};

export const getPublicCaseStudyByIdentifier = async (identifier: string) => {
  await connectDB();

  const caseStudy =
    await CaseStudyRepository.findPublicByIdentifierPopulated(identifier);
  if (!caseStudy || !caseStudy.category || !caseStudy.author) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study not found");
  }

  return toPublicCaseStudyDto(caseStudy);
};

export const getPublicCaseStudyById = getPublicCaseStudyByIdentifier;

export const getPublicCaseStudiesForComposition = async (input: {
  ids?: readonly string[];
  limit: number;
  filters: Readonly<Record<string, string | boolean>>;
}) => {
  await connectDB();
  const records = await CaseStudyRepository.findPublicForComposition(input);
  return records.map(toPublicCaseStudyDto);
};

export const createCaseStudy = async (
  payload: TCaseStudyCreatePayload,
  actor?: TJwtPayload
) => {
  const db = await connectDB();
  await assertActiveCategory(payload.category);

  const fileIds = [
    ...(payload.thumbnail ? [payload.thumbnail] : []),
    ...(payload.images ?? []),
  ];
  await FileService.validateFileIds(fileIds, ["case_study"], actor);

  const status = payload.status || "draft";
  if (status === "published") assertCaseStudyPublishable(payload);
  const published_at =
    status === "published" ? payload.published_at || new Date() : undefined;
  const expired_at = payload.expired_at
    ? new Date(payload.expired_at)
    : undefined;
  const body = prepareBody(payload.content);

  const entityId = new Types.ObjectId().toString();
  const slug = await allocateContentSlug({
    scope: "case_study",
    requested: payload.slug || payload.name,
    fallback: "case-study",
    target: entityId,
  });

  let created:
    | Awaited<ReturnType<typeof CaseStudyRepository.create>>
    | undefined;
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      created = await CaseStudyRepository.create(
        {
          ...payload,
          _id: entityId,
          slug,
          slug_history: [],
          secondary_pillars: normalizePillarRelationships(
            payload.primary_pillar,
            payload.secondary_pillars
          ),
          ...body,
          status,
          published_at,
          expired_at,
          is_featured: payload.is_featured || false,
          layout: payload.layout || "default",
        } as never,
        session
      );
      await reserveContentSlug({
        scope: "case_study",
        slug,
        target: entityId,
        session,
      });

      if (payload.thumbnail) {
        await FileService.attachToEntity({
          fileIds: payload.thumbnail,
          model: MODEL,
          entity: entityId,
          field: "thumbnail",
          actor,
          session,
        });
      }
      if (payload.images?.length) {
        await FileService.attachToEntity({
          fileIds: payload.images,
          model: MODEL,
          entity: entityId,
          field: "images",
          actor,
          session,
        });
      }
    });
  } finally {
    await session.endSession();
  }

  if (!created) {
    throw new AppError(
      httpStatus.SERVICE_UNAVAILABLE,
      "Case study could not be committed"
    );
  }
  const result =
    (await CaseStudyRepository.findByIdPopulated(entityId)) || created;
  await invalidatePublishedComposition();
  return result;
};

export const updateCaseStudyById = async (
  id: string,
  payload: TCaseStudyUpdatePayload,
  actor?: TJwtPayload
) => {
  const db = await connectDB();

  const caseStudy = await CaseStudyRepository.findById(id);
  if (!caseStudy) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study not found");
  }

  if (payload.category) await assertActiveCategory(payload.category);

  const newFileIds = [
    ...(payload.thumbnail ? [payload.thumbnail] : []),
    ...(payload.images ?? []),
  ];
  await FileService.validateFileIds(newFileIds, ["case_study"], actor);

  const previousThumbnail = toIdString(caseStudy.thumbnail);
  const previousImages = toIdArray(caseStudy.images);

  const updateData: Record<string, unknown> = { ...payload };
  if (payload.status === "published" && caseStudy.status !== "published") {
    assertCaseStudyPublishable({ ...caseStudy.toObject(), ...payload });
  }

  const requestedSlug =
    payload.slug ??
    (!caseStudy.slug ? (payload.name ?? caseStudy.name) : undefined);
  const nextSlug = requestedSlug
    ? await allocateContentSlug({
        scope: "case_study",
        requested: requestedSlug,
        fallback: "case-study",
        target: id,
      })
    : caseStudy.slug;
  if (nextSlug && nextSlug !== caseStudy.slug) {
    updateData.slug = nextSlug;
    updateData.slug_history = [
      ...(caseStudy.slug_history ?? []),
      ...(caseStudy.slug
        ? [{ slug: caseStudy.slug, changed_at: new Date() }]
        : []),
    ];
  }
  if (payload.primary_pillar !== undefined || payload.secondary_pillars) {
    updateData.secondary_pillars = normalizePillarRelationships(
      payload.primary_pillar ?? caseStudy.primary_pillar,
      payload.secondary_pillars ?? caseStudy.secondary_pillars
    );
  }
  if (payload.content !== undefined) {
    Object.assign(updateData, prepareBody(payload.content));
  }
  if (payload.published_at) {
    updateData.published_at = new Date(payload.published_at);
  }
  if (payload.expired_at !== undefined) {
    updateData.expired_at = payload.expired_at
      ? new Date(payload.expired_at)
      : null;
  }
  if (payload.status === "published" && !updateData.published_at) {
    updateData.published_at = caseStudy.published_at ?? new Date();
  }

  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      if (nextSlug) {
        await reserveContentSlug({
          scope: "case_study",
          slug: nextSlug,
          target: id,
          session,
        });
      }
      Object.assign(caseStudy, updateData);
      await caseStudy.save({ session });

      if (payload.thumbnail !== undefined) {
        await FileService.reconcileEntityRefs({
          model: MODEL,
          entity: id,
          field: "thumbnail",
          previous: previousThumbnail,
          next: payload.thumbnail,
          actor,
          session,
        });
      }
      if (payload.images !== undefined) {
        await FileService.reconcileEntityRefs({
          model: MODEL,
          entity: id,
          field: "images",
          previous: previousImages,
          next: payload.images,
          actor,
          session,
        });
      }
    });
  } finally {
    await session.endSession();
  }

  const result = await CaseStudyRepository.findByIdPopulated(id);
  await invalidatePublishedComposition();
  return result;
};

export const updateCaseStudies = async (
  ids: string[],
  payload: Partial<{
    status: TCaseStudyStatusValue;
    is_featured: boolean;
    category: string;
  }>
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  if (payload.category) await assertActiveCategory(payload.category);
  const caseStudies = await CaseStudyRepository.findManyByIds(ids);
  const foundIds = caseStudies.map((caseStudy) => caseStudy._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  if (payload.status === "published") {
    const incompleteIds = caseStudies
      .filter(
        (caseStudy) =>
          caseStudy.status !== "published" &&
          getCaseStudyPublishReadiness(caseStudy).length > 0
      )
      .map((caseStudy) => caseStudy._id.toString());
    if (incompleteIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Case studies are not publishable until their story and role are complete: ${incompleteIds.join(", ")}`
      );
    }
    await CaseStudyRepository.setPublishedAtIfMissing(foundIds, new Date());
  }

  const result = await CaseStudyRepository.updateMany(
    foundIds,
    payload as never
  );
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteCaseStudyById = async (id: string) => {
  await connectDB();

  const caseStudy = await CaseStudyRepository.softDeleteById(id);
  if (!caseStudy) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study not found");
  }

  await invalidatePublishedComposition();

  return null;
};

export const deleteCaseStudyPermanentById = async (
  id: string
): Promise<void> => {
  await connectDB();

  const caseStudy = await CaseStudyRepository.findDeletedById(id);
  if (!caseStudy) {
    throw new AppError(httpStatus.NOT_FOUND, "Case study not found");
  }

  const deleted = await CaseStudyRepository.hardDeleteById(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Case study changed while permanent deletion was in progress"
    );
  }

  await FileService.detachAllForEntity({ model: MODEL, entity: id });
  await invalidatePublishedComposition();
};

export const deleteCaseStudies = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const caseStudies = await CaseStudyRepository.findManyByIds(ids);
  const foundIds = caseStudies.map((caseStudy) => caseStudy._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await CaseStudyRepository.softDeleteMany(foundIds);
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteCaseStudiesPermanent = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const caseStudies = await CaseStudyRepository.findDeletedManyByIds(ids);
  const foundIds = caseStudies.map((caseStudy) => caseStudy._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const outcomes = await Promise.all(
    foundIds.map(async (entityId) => {
      const deleted = await CaseStudyRepository.hardDeleteById(entityId);
      if (!deleted) return false;

      await FileService.detachAllForEntity({ model: MODEL, entity: entityId });
      return true;
    })
  );
  const notDeletedIds = foundIds.filter((_, index) => !outcomes[index]);
  if (outcomes.some(Boolean)) await invalidatePublishedComposition();

  return {
    count: outcomes.filter(Boolean).length,
    not_found_ids: [...new Set([...notFoundIds, ...notDeletedIds])],
  };
};

export const restoreCaseStudyById = async (id: string) => {
  await connectDB();

  const candidate = await CaseStudyRepository.findDeletedById(id);
  if (!candidate) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Case study not found or not deleted"
    );
  }

  const notRestorableIds = await CaseStudyRepository.findNotRestorableIds([
    candidate,
  ]);
  if (notRestorableIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Case study cannot be restored until its category and author are active"
    );
  }

  const caseStudy = await CaseStudyRepository.restoreById(id);
  if (!caseStudy) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Case study changed while restoration was in progress"
    );
  }

  await invalidatePublishedComposition();

  return caseStudy;
};

export const restoreCaseStudies = async (
  ids: string[]
): Promise<{
  count: number;
  not_found_ids: string[];
  not_restorable_ids: string[];
}> => {
  await connectDB();

  const caseStudies = await CaseStudyRepository.findDeletedManyByIds(ids);
  const foundIds = caseStudies.map((caseStudy) => caseStudy._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));
  const notRestorableIds =
    await CaseStudyRepository.findNotRestorableIds(caseStudies);
  const notRestorableSet = new Set(notRestorableIds);
  const restorableIds = foundIds.filter((id) => !notRestorableSet.has(id));
  const result = restorableIds.length
    ? await CaseStudyRepository.restoreMany(restorableIds)
    : { modifiedCount: 0 };
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
    not_restorable_ids: notRestorableIds,
  };
};
