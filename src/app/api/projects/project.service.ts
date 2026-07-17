import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import {
  normalizePillarRelationships,
  type PillarKey,
} from "@/lib/content/pillars";
import {
  getProjectPublishReadiness,
  type LinkVisibility,
  type ProjectDeliveryStatus,
  type ProjectOutcome,
  type ProjectPublicationStatus,
  type ProjectType,
} from "@/lib/content/portfolio-contract";
import {
  createLegacyRichContentDocument,
  sanitizeRichHtml,
} from "@/lib/content/rich-content";
import { withPublicPagination } from "@/utils/public-query";
import {
  buildProjectDiscoveryRepositoryQuery,
  normalizeProjectDiscoveryCompositionFilter,
  parseProjectDiscoveryQuery,
} from "@/lib/discovery/public-discovery";
import type { TJwtPayload } from "@/types/jsonwebtoken.type";
import httpStatus from "http-status";
import { Types } from "mongoose";
import { toPublicProjectDto } from "../public-content.dto";
import {
  allocateContentSlug,
  reserveContentSlug,
} from "../content-slug-aliases/content-slug-alias.service";
import * as FileService from "../files/file.service";
import * as ProjectCategoryRepository from "../project-categories/project-category.repository";
import * as ProjectRepository from "./project.repository";
import { invalidatePublicContentAfterCommit } from "../public-content-cache/cache-invalidation.service";

const MODEL = "Project" as const;

const invalidatePublishedComposition = async (): Promise<void> => {
  try {
    await invalidatePublicContentAfterCommit("project");
  } catch {
    console.error("project_public_cache_intent_failed", {
      error_code: "cache_intent_failed",
    });
  }
};

const prepareRichContent = (content: string) => {
  const sanitizedContent = sanitizeRichHtml(content).trim();
  if (!sanitizedContent) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Project content must contain safe readable content"
    );
  }

  return {
    content: sanitizedContent,
    rich_content: createLegacyRichContentDocument(sanitizedContent),
  };
};

const assertActiveCategory = async (categoryId: string): Promise<void> => {
  const category = await ProjectCategoryRepository.findById(categoryId);
  if (!category || category.status !== "active") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "An active project category is required"
    );
  }
};

const assertProjectPublishable = (
  candidate: Parameters<typeof getProjectPublishReadiness>[0]
): void => {
  const missing = getProjectPublishReadiness(candidate);
  if (missing.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Project case study is not publishable; complete: ${missing.join(", ")}`
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

export const getProjects = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  return await ProjectRepository.findPaginated(queryParams);
};

export const getPublicProjects = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  const result = await ProjectRepository.findPublicPaginated(
    withPublicPagination(queryParams)
  );
  return { ...result, data: result.data.map(toPublicProjectDto) };
};

export const getPublicProjectDiscovery = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  const query = parseProjectDiscoveryQuery(
    queryParams as Record<string, string | number | null | undefined>
  );
  const category =
    query.category === "all"
      ? null
      : await ProjectCategoryRepository.findPublicByIdentifierPopulated(
          query.category
        );
  const composition = normalizeProjectDiscoveryCompositionFilter({
    featured: queryParams.composition_featured,
    pillar: queryParams.composition_pillar,
    project_type: queryParams.composition_project_type,
  });
  const result = await ProjectRepository.findPublicPaginated(
    buildProjectDiscoveryRepositoryQuery(
      query,
      category?._id?.toString(),
      composition
    )
  );
  return {
    ...result,
    data: result.data.map(toPublicProjectDto),
    query:
      category?.slug && category.slug !== query.category
        ? { ...query, category: category.slug }
        : query,
  };
};

export const getPublicProjectDiscoveryFacets = async () => {
  await connectDB();
  return ProjectRepository.findPublicDiscoveryFacets();
};

export const getProjectById = async (id: string) => {
  await connectDB();

  const project = await ProjectRepository.findByIdPopulated(id);
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  return project;
};

export const getPublicProjectByIdentifier = async (identifier: string) => {
  await connectDB();

  const project =
    await ProjectRepository.findPublicByIdentifierPopulated(identifier);
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  return toPublicProjectDto(project);
};

export const getPublicProjectById = getPublicProjectByIdentifier;

export const getPublicProjectsForComposition = async (input: {
  ids?: readonly string[];
  limit: number;
  filters: Readonly<Record<string, string | boolean>>;
}) => {
  await connectDB();
  const records = await ProjectRepository.findPublicForComposition(input);
  return records.map(toPublicProjectDto);
};

export const createProject = async (
  payload: {
    name: string;
    slug?: string;
    content: string;
    category: string;
    author: string;
    description?: string;
    thumbnail?: string | null;
    images?: string[];
    tags?: string[];
    client?: string;
    collaborators?: string[];
    primary_pillar?: PillarKey;
    secondary_pillars?: PillarKey[];
    delivery_status?: ProjectDeliveryStatus;
    publication_status?: ProjectPublicationStatus;
    project_type?: ProjectType;
    problem?: string;
    constraints?: string[];
    role?: string;
    architecture?: string;
    decisions?: string[];
    implementation?: string;
    security?: string;
    performance_reliability?: string;
    outcomes?: ProjectOutcome[];
    learnings?: string[];
    live_url?: string | null;
    live_url_visibility?: LinkVisibility;
    source_url?: string | null;
    source_url_visibility?: LinkVisibility;
    status?: "planned" | "in_progress" | "on_hold" | "completed" | "cancelled";
    is_featured?: boolean;
    is_premium?: boolean;
    started_at?: Date | string;
    ended_at?: Date | string;
    layout?: string;
  },
  actor?: TJwtPayload
) => {
  const db = await connectDB();
  await assertActiveCategory(payload.category);

  const fileIds = [
    ...(payload.thumbnail ? [payload.thumbnail] : []),
    ...(payload.images ?? []),
  ];
  await FileService.validateFileIds(fileIds, ["project"], actor);
  const richContent = prepareRichContent(payload.content);
  if (payload.publication_status === "published") {
    assertProjectPublishable(payload);
  }
  const entityId = new Types.ObjectId().toString();
  const slug = await allocateContentSlug({
    scope: "project",
    requested: payload.slug || payload.name,
    fallback: "project",
    target: entityId,
  });

  let created: Awaited<ReturnType<typeof ProjectRepository.create>> | undefined;
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      created = await ProjectRepository.create(
        {
          ...payload,
          _id: entityId,
          slug,
          slug_history: [],
          secondary_pillars: normalizePillarRelationships(
            payload.primary_pillar,
            payload.secondary_pillars
          ),
          delivery_status:
            payload.delivery_status ??
            (payload.status === "completed"
              ? "completed"
              : payload.status === "in_progress" || payload.status === "on_hold"
                ? "active"
                : payload.status === "planned" || !payload.status
                  ? "planned"
                  : undefined),
          publication_status: payload.publication_status ?? "draft",
          ...richContent,
          status: payload.status || "planned",
          is_featured: payload.is_featured || false,
          is_premium: payload.is_premium || false,
          started_at: payload.started_at
            ? new Date(payload.started_at)
            : undefined,
          ended_at: payload.ended_at ? new Date(payload.ended_at) : undefined,
          layout: payload.layout || "default",
        } as never,
        session
      );
      await reserveContentSlug({
        scope: "project",
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
      "Project could not be committed"
    );
  }
  const result =
    (await ProjectRepository.findByIdPopulated(entityId)) || created;
  await invalidatePublishedComposition();
  return result;
};

export const updateProjectById = async (
  id: string,
  payload: Partial<{
    name: string;
    slug: string;
    description: string;
    content: string;
    thumbnail: string | null;
    images: string[];
    tags: string[];
    category: string;
    client: string;
    collaborators: string[];
    primary_pillar: PillarKey;
    secondary_pillars: PillarKey[];
    delivery_status: ProjectDeliveryStatus;
    publication_status: ProjectPublicationStatus;
    project_type: ProjectType;
    problem: string;
    constraints: string[];
    role: string;
    architecture: string;
    decisions: string[];
    implementation: string;
    security: string;
    performance_reliability: string;
    outcomes: ProjectOutcome[];
    learnings: string[];
    live_url: string | null;
    live_url_visibility: LinkVisibility;
    source_url: string | null;
    source_url_visibility: LinkVisibility;
    status: "planned" | "in_progress" | "on_hold" | "completed" | "cancelled";
    is_featured: boolean;
    is_premium: boolean;
    started_at: Date | string;
    ended_at: Date | string;
    layout: string;
  }>,
  actor?: TJwtPayload
) => {
  const db = await connectDB();

  const project = await ProjectRepository.findById(id);
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  if (payload.category) {
    await assertActiveCategory(payload.category);
  }

  const newFileIds = [
    ...(payload.thumbnail ? [payload.thumbnail] : []),
    ...(payload.images ?? []),
  ];
  await FileService.validateFileIds(newFileIds, ["project"], actor);

  const previousThumbnail = toIdString(project.thumbnail);
  const previousImages = toIdArray(project.images);

  const updateData: Record<string, unknown> = { ...payload };
  if (
    payload.publication_status === "published" &&
    project.publication_status !== "published"
  ) {
    assertProjectPublishable({ ...project.toObject(), ...payload });
  }
  const requestedSlug =
    payload.slug ??
    (!project.slug ? (payload.name ?? project.name) : undefined);
  const nextSlug = requestedSlug
    ? await allocateContentSlug({
        scope: "project",
        requested: requestedSlug,
        fallback: "project",
        target: id,
      })
    : project.slug;
  if (nextSlug && nextSlug !== project.slug) {
    updateData.slug = nextSlug;
    updateData.slug_history = [
      ...(project.slug_history ?? []),
      ...(project.slug ? [{ slug: project.slug, changed_at: new Date() }] : []),
    ];
  }
  if (payload.primary_pillar !== undefined || payload.secondary_pillars) {
    updateData.secondary_pillars = normalizePillarRelationships(
      payload.primary_pillar ?? project.primary_pillar,
      payload.secondary_pillars ?? project.secondary_pillars
    );
  }
  if (payload.status && payload.delivery_status === undefined) {
    const mappedDelivery =
      payload.status === "completed"
        ? "completed"
        : payload.status === "in_progress" || payload.status === "on_hold"
          ? "active"
          : payload.status === "planned"
            ? "planned"
            : undefined;
    if (mappedDelivery) updateData.delivery_status = mappedDelivery;
  }
  if (payload.content !== undefined) {
    Object.assign(updateData, prepareRichContent(payload.content));
  } else if (
    payload.status === "completed" ||
    payload.publication_status === "published"
  ) {
    Object.assign(updateData, prepareRichContent(project.content));
  }
  if (payload.started_at) {
    updateData.started_at = new Date(payload.started_at);
  }
  if (payload.ended_at) {
    updateData.ended_at = new Date(payload.ended_at);
  }

  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      if (nextSlug) {
        await reserveContentSlug({
          scope: "project",
          slug: nextSlug,
          target: id,
          session,
        });
      }
      Object.assign(project, updateData);
      await project.save({ session });

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

  const result = await ProjectRepository.findByIdPopulated(id);
  await invalidatePublishedComposition();
  return result;
};

export const updateProjects = async (
  ids: string[],
  payload: Partial<{
    status: "planned" | "in_progress" | "on_hold" | "completed" | "cancelled";
    is_featured: boolean;
    category: string;
  }>
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  if (payload.category) {
    await assertActiveCategory(payload.category);
  }
  const projects = await ProjectRepository.findManyByIds(ids);
  const foundIds = projects.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  if (payload.status === "completed") {
    await ProjectRepository.replaceRichContentMany(
      projects.map((project) => ({
        id: project._id.toString(),
        ...prepareRichContent(project.content),
      }))
    );
  }

  const updatePayload: Record<string, unknown> = { ...payload };
  if (payload.status) {
    const mappedDelivery =
      payload.status === "completed"
        ? "completed"
        : payload.status === "in_progress" || payload.status === "on_hold"
          ? "active"
          : payload.status === "planned"
            ? "planned"
            : undefined;
    if (mappedDelivery) updatePayload.delivery_status = mappedDelivery;
  }
  const result = await ProjectRepository.updateMany(
    foundIds,
    updatePayload as never
  );
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteProjectById = async (id: string) => {
  await connectDB();

  const project = await ProjectRepository.softDeleteById(id);
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  await invalidatePublishedComposition();

  return null;
};

export const deleteProjectPermanentById = async (id: string): Promise<void> => {
  await connectDB();

  const project = await ProjectRepository.findDeletedById(id);
  if (!project) {
    throw new AppError(httpStatus.NOT_FOUND, "Project not found");
  }

  const dependentIds = await ProjectRepository.findIdsWithDependents([id]);
  if (dependentIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Cannot permanently delete a project that still has resources or reviews"
    );
  }

  const deleted = await ProjectRepository.hardDeleteById(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Project changed while permanent deletion was in progress"
    );
  }

  await FileService.detachAllForEntity({ model: MODEL, entity: id });
  await invalidatePublishedComposition();
};

export const deleteProjects = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const projects = await ProjectRepository.findManyByIds(ids);
  const foundIds = projects.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await ProjectRepository.softDeleteMany(foundIds);
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteProjectsPermanent = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const projects = await ProjectRepository.findDeletedManyByIds(ids);
  const foundIds = projects.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const dependentIds = await ProjectRepository.findIdsWithDependents(foundIds);
  if (dependentIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Cannot permanently delete project(s) with resources or reviews: ${dependentIds.join(", ")}`
    );
  }

  const outcomes = await Promise.all(
    foundIds.map(async (entityId) => {
      const deleted = await ProjectRepository.hardDeleteById(entityId);
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

export const restoreProjectById = async (id: string) => {
  await connectDB();

  const candidate = await ProjectRepository.findDeletedById(id);
  if (!candidate) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Project not found or not deleted"
    );
  }

  const notRestorableIds = await ProjectRepository.findNotRestorableIds([
    candidate,
  ]);
  if (notRestorableIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Project cannot be restored until its category and users are active"
    );
  }

  const project = await ProjectRepository.restoreById(id);
  if (!project) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Project changed while restoration was in progress"
    );
  }

  await invalidatePublishedComposition();

  return project;
};

export const restoreProjects = async (
  ids: string[]
): Promise<{
  count: number;
  not_found_ids: string[];
  not_restorable_ids: string[];
}> => {
  await connectDB();

  const projects = await ProjectRepository.findDeletedManyByIds(ids);
  const foundIds = projects.map((project) => project._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));
  const notRestorableIds =
    await ProjectRepository.findNotRestorableIds(projects);
  const notRestorableSet = new Set(notRestorableIds);
  const restorableIds = foundIds.filter((id) => !notRestorableSet.has(id));
  const result = restorableIds.length
    ? await ProjectRepository.restoreMany(restorableIds)
    : { modifiedCount: 0 };
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
    not_restorable_ids: notRestorableIds,
  };
};
