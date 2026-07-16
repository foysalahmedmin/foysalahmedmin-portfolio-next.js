import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import {
  normalizePillarRelationships,
  type PillarKey,
} from "@/lib/content/pillars";
import {
  deriveArticleBodyMetadata,
  deriveReadingTimeMinutes,
  getArticlePublishReadiness,
} from "@/lib/content/portfolio-contract";
import {
  createLegacyRichContentDocument,
  sanitizeRichHtml,
} from "@/lib/content/rich-content";
import { withPublicPagination } from "@/utils/public-query";
import {
  buildArticleDiscoveryRepositoryQuery,
  parseArticleDiscoveryQuery,
} from "@/lib/discovery/public-discovery";
import type { TJwtPayload } from "@/types/jsonwebtoken.type";
import httpStatus from "http-status";
import { Types } from "mongoose";
import {
  allocateContentSlug,
  reserveContentSlug,
} from "../content-slug-aliases/content-slug-alias.service";
import { toPublicArticleDto } from "../public-content.dto";
import * as ArticleCategoryRepository from "../article-categories/article-category.repository";
import * as FileService from "../files/file.service";
import * as ArticleRepository from "./article.repository";
import { invalidatePublicContentAfterCommit } from "../public-content-cache/cache-invalidation.service";

const MODEL = "Article" as const;

const invalidatePublishedComposition = async (): Promise<void> => {
  try {
    await invalidatePublicContentAfterCommit("article");
  } catch {
    console.error("article_public_cache_intent_failed", {
      error_code: "cache_intent_failed",
    });
  }
};

const prepareRichContent = (content: string) => {
  const sanitizedContent = sanitizeRichHtml(content).trim();
  if (!sanitizedContent) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Article content must contain safe readable content"
    );
  }

  const bodyMetadata = deriveArticleBodyMetadata(sanitizedContent);
  return {
    content: sanitizedContent,
    rich_content: createLegacyRichContentDocument(sanitizedContent),
    body_metadata: bodyMetadata,
  };
};

const assertActiveCategory = async (categoryId: string): Promise<void> => {
  const category = await ArticleCategoryRepository.findById(categoryId);
  if (!category || category.status !== "active") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "An active article category is required"
    );
  }
};

const assertArticlePublishable = (
  candidate: Parameters<typeof getArticlePublishReadiness>[0]
): void => {
  const missing = getArticlePublishReadiness(candidate);
  if (missing.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Article is not publishable; complete: ${missing.join(", ")}`
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

export const getArticles = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  return await ArticleRepository.findPaginated(queryParams);
};

export const getPublicArticles = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  const result = await ArticleRepository.findPublicPaginated(
    withPublicPagination(queryParams)
  );
  return { ...result, data: result.data.map(toPublicArticleDto) };
};

export const getPublicArticleDiscovery = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  const query = parseArticleDiscoveryQuery(
    queryParams as Record<string, string | number | null | undefined>
  );
  const category =
    query.category === "all"
      ? null
      : await ArticleCategoryRepository.findPublicByIdentifierPopulated(
          query.category
        );
  const result = await ArticleRepository.findPublicPaginated(
    buildArticleDiscoveryRepositoryQuery(query, category?._id?.toString())
  );
  return {
    ...result,
    data: result.data.map(toPublicArticleDto),
    query:
      category?.slug && category.slug !== query.category
        ? { ...query, category: category.slug }
        : query,
  };
};

export const getPublicArticleDiscoveryFacets = async () => {
  await connectDB();
  return ArticleRepository.findPublicDiscoveryFacets();
};

export const getArticleById = async (id: string) => {
  await connectDB();

  const article = await ArticleRepository.findByIdPopulated(id);
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, "Article not found");
  }

  return article;
};

export const getPublicArticleByIdentifier = async (identifier: string) => {
  await connectDB();

  const article =
    await ArticleRepository.findPublicByIdentifierPopulated(identifier);
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, "Article not found");
  }

  return toPublicArticleDto(article);
};

export const getPublicArticleById = getPublicArticleByIdentifier;

export const getPublicArticlesForComposition = async (input: {
  ids?: readonly string[];
  limit: number;
  filters: Readonly<Record<string, string | boolean>>;
}) => {
  await connectDB();
  const records = await ArticleRepository.findPublicForComposition(input);
  return records.map(toPublicArticleDto);
};

export const createArticle = async (
  payload: {
    name: string;
    slug?: string;
    excerpt?: string;
    content: string;
    category: string;
    author: string;
    description?: string;
    thumbnail?: string | null;
    images?: string[];
    tags?: string[];
    collaborators?: string[];
    primary_pillar?: PillarKey;
    secondary_pillars?: PillarKey[];
    topics?: string[];
    reading_time_minutes?: number;
    reading_time_source?: "derived" | "manual";
    status?: "draft" | "pending" | "published" | "archived";
    is_featured?: boolean;
    is_premium?: boolean;
    published_at?: Date | string;
    expired_at?: Date | string | null;
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
  await FileService.validateFileIds(fileIds, ["article"], actor);

  const status = payload.status || "draft";
  if (status === "published") assertArticlePublishable(payload);
  const published_at =
    status === "published" ? payload.published_at || new Date() : undefined;
  const expired_at = payload.expired_at
    ? new Date(payload.expired_at)
    : undefined;
  const richContent = prepareRichContent(payload.content);
  if (
    payload.reading_time_source === "manual" &&
    payload.reading_time_minutes === undefined
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Manual reading time requires reading_time_minutes"
    );
  }
  const entityId = new Types.ObjectId().toString();
  const slug = await allocateContentSlug({
    scope: "article",
    requested: payload.slug || payload.name,
    fallback: "article",
    target: entityId,
  });
  const readingTimeSource = payload.reading_time_source ?? "derived";
  const readingTimeMinutes =
    readingTimeSource === "manual" && payload.reading_time_minutes
      ? payload.reading_time_minutes
      : deriveReadingTimeMinutes(richContent.body_metadata.word_count);

  let created: Awaited<ReturnType<typeof ArticleRepository.create>> | undefined;
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      created = await ArticleRepository.create(
        {
          ...payload,
          _id: entityId,
          slug,
          slug_history: [],
          secondary_pillars: normalizePillarRelationships(
            payload.primary_pillar,
            payload.secondary_pillars
          ),
          ...richContent,
          reading_time_source: readingTimeSource,
          reading_time_minutes: readingTimeMinutes,
          status,
          published_at,
          expired_at,
          is_featured: payload.is_featured || false,
          is_premium: payload.is_premium || false,
          layout: payload.layout || "default",
        } as never,
        session
      );
      await reserveContentSlug({
        scope: "article",
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
      "Article could not be committed"
    );
  }
  const result =
    (await ArticleRepository.findByIdPopulated(entityId)) || created;
  await invalidatePublishedComposition();
  return result;
};

export const updateArticleById = async (
  id: string,
  payload: Partial<{
    name: string;
    slug: string;
    excerpt: string;
    description: string;
    content: string;
    thumbnail: string | null;
    images: string[];
    tags: string[];
    category: string;
    collaborators: string[];
    primary_pillar: PillarKey;
    secondary_pillars: PillarKey[];
    topics: string[];
    reading_time_minutes: number;
    reading_time_source: "derived" | "manual";
    status: "draft" | "pending" | "published" | "archived";
    is_featured: boolean;
    is_premium: boolean;
    published_at: Date | string;
    expired_at: Date | string | null;
    layout: string;
  }>,
  actor?: TJwtPayload
) => {
  const db = await connectDB();

  const article = await ArticleRepository.findById(id);
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, "Article not found");
  }

  if (payload.category) {
    await assertActiveCategory(payload.category);
  }

  const newFileIds = [
    ...(payload.thumbnail ? [payload.thumbnail] : []),
    ...(payload.images ?? []),
  ];
  await FileService.validateFileIds(newFileIds, ["article"], actor);

  const previousThumbnail = toIdString(article.thumbnail);
  const previousImages = toIdArray(article.images);

  const updateData: Record<string, unknown> = { ...payload };
  if (payload.status === "published" && article.status !== "published") {
    assertArticlePublishable({ ...article.toObject(), ...payload });
  }
  const requestedSlug =
    payload.slug ??
    (!article.slug ? (payload.name ?? article.name) : undefined);
  const nextSlug = requestedSlug
    ? await allocateContentSlug({
        scope: "article",
        requested: requestedSlug,
        fallback: "article",
        target: id,
      })
    : article.slug;
  if (nextSlug && nextSlug !== article.slug) {
    updateData.slug = nextSlug;
    updateData.slug_history = [
      ...(article.slug_history ?? []),
      ...(article.slug ? [{ slug: article.slug, changed_at: new Date() }] : []),
    ];
  }
  if (payload.primary_pillar !== undefined || payload.secondary_pillars) {
    updateData.secondary_pillars = normalizePillarRelationships(
      payload.primary_pillar ?? article.primary_pillar,
      payload.secondary_pillars ?? article.secondary_pillars
    );
  }
  if (
    payload.reading_time_source === "manual" &&
    payload.reading_time_minutes === undefined &&
    article.reading_time_minutes === undefined
  ) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Manual reading time requires reading_time_minutes"
    );
  }
  if (payload.content !== undefined) {
    const prepared = prepareRichContent(payload.content);
    Object.assign(updateData, prepared);
    const source = payload.reading_time_source ?? article.reading_time_source;
    if (source !== "manual" || payload.reading_time_minutes === undefined) {
      updateData.reading_time_source = "derived";
      updateData.reading_time_minutes = deriveReadingTimeMinutes(
        prepared.body_metadata.word_count
      );
    }
  } else if (payload.status === "published") {
    Object.assign(updateData, prepareRichContent(article.content));
  }
  if (
    payload.content === undefined &&
    payload.reading_time_source === "derived"
  ) {
    const metadata = deriveArticleBodyMetadata(article.content);
    updateData.body_metadata = metadata;
    updateData.reading_time_minutes = deriveReadingTimeMinutes(
      metadata.word_count
    );
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
    updateData.published_at = new Date();
  }

  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      if (nextSlug) {
        await reserveContentSlug({
          scope: "article",
          slug: nextSlug,
          target: id,
          session,
        });
      }
      Object.assign(article, updateData);
      await article.save({ session });

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

  const result = await ArticleRepository.findByIdPopulated(id);
  await invalidatePublishedComposition();
  return result;
};

export const updateArticles = async (
  ids: string[],
  payload: Partial<{
    status: "draft" | "pending" | "published" | "archived";
    is_featured: boolean;
    category: string;
  }>
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  if (payload.category) {
    await assertActiveCategory(payload.category);
  }
  const articles = await ArticleRepository.findManyByIds(ids);
  const foundIds = articles.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  if (payload.status === "published") {
    const incompleteIds = articles
      .filter(
        (article) =>
          article.status !== "published" &&
          getArticlePublishReadiness(article).length > 0
      )
      .map((article) => article._id.toString());
    if (incompleteIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Articles are not publishable until excerpt and primary pillar are complete: ${incompleteIds.join(", ")}`
      );
    }
    await ArticleRepository.replaceRichContentMany(
      articles.map((article) => {
        const prepared = prepareRichContent(article.content);
        const manualReadingTime =
          article.reading_time_source === "manual" &&
          typeof article.reading_time_minutes === "number";
        return {
          id: article._id.toString(),
          ...prepared,
          reading_time_source: manualReadingTime ? "manual" : "derived",
          reading_time_minutes: manualReadingTime
            ? article.reading_time_minutes
            : deriveReadingTimeMinutes(prepared.body_metadata.word_count),
        };
      })
    );
    await ArticleRepository.setPublishedAtIfMissing(foundIds, new Date());
  }

  const result = await ArticleRepository.updateMany(foundIds, payload as never);
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteArticleById = async (id: string) => {
  await connectDB();

  const article = await ArticleRepository.softDeleteById(id);
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, "Article not found");
  }

  await invalidatePublishedComposition();

  return null;
};

export const deleteArticlePermanentById = async (id: string): Promise<void> => {
  await connectDB();

  const article = await ArticleRepository.findDeletedById(id);
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, "Article not found");
  }

  const dependentIds = await ArticleRepository.findIdsWithDependentReviews([
    id,
  ]);
  if (dependentIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Cannot permanently delete an article that still has reviews"
    );
  }

  const deleted = await ArticleRepository.hardDeleteById(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Article changed while permanent deletion was in progress"
    );
  }

  await FileService.detachAllForEntity({ model: MODEL, entity: id });
  await invalidatePublishedComposition();
};

export const deleteArticles = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const articles = await ArticleRepository.findManyByIds(ids);
  const foundIds = articles.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await ArticleRepository.softDeleteMany(foundIds);
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteArticlesPermanent = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const articles = await ArticleRepository.findDeletedManyByIds(ids);
  const foundIds = articles.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const dependentIds =
    await ArticleRepository.findIdsWithDependentReviews(foundIds);
  if (dependentIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      `Cannot permanently delete article(s) with reviews: ${dependentIds.join(", ")}`
    );
  }

  const outcomes = await Promise.all(
    foundIds.map(async (entityId) => {
      const deleted = await ArticleRepository.hardDeleteById(entityId);
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

export const restoreArticleById = async (id: string) => {
  await connectDB();

  const candidate = await ArticleRepository.findDeletedById(id);
  if (!candidate) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "Article not found or not deleted"
    );
  }

  const notRestorableIds = await ArticleRepository.findNotRestorableIds([
    candidate,
  ]);
  if (notRestorableIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Article cannot be restored until its category and users are active"
    );
  }

  const article = await ArticleRepository.restoreById(id);
  if (!article) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Article changed while restoration was in progress"
    );
  }

  await invalidatePublishedComposition();

  return article;
};

export const restoreArticles = async (
  ids: string[]
): Promise<{
  count: number;
  not_found_ids: string[];
  not_restorable_ids: string[];
}> => {
  await connectDB();

  const articles = await ArticleRepository.findDeletedManyByIds(ids);
  const foundIds = articles.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));
  const notRestorableIds =
    await ArticleRepository.findNotRestorableIds(articles);
  const notRestorableSet = new Set(notRestorableIds);
  const restorableIds = foundIds.filter((id) => !notRestorableSet.has(id));
  const result = restorableIds.length
    ? await ArticleRepository.restoreMany(restorableIds)
    : { modifiedCount: 0 };
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
    not_restorable_ids: notRestorableIds,
  };
};
