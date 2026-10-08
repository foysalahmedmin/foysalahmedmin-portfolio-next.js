import AppError from "@/builder/app-error";
import connectDB from "@/lib/db";
import {
  getVideoPublishReadiness,
  normalizeVideoKeywords,
  parseYouTubeVideoId,
  toCanonicalYouTubeUrl,
  type VideoAspectRatio,
  type VideoSourceType,
} from "@/lib/content/video-contract";
import {
  buildVideoApiRepositoryQuery,
  normalizeVideoDiscoveryCompositionFilter,
  parseVideoApiQuery,
} from "@/lib/discovery/video-discovery";
import type { TJwtPayload } from "@/types/jsonwebtoken.type";
import { withPublicPagination } from "@/utils/public-query";
import httpStatus from "http-status";
import { Types } from "mongoose";
import {
  allocateContentSlug,
  reserveContentSlug,
} from "../content-slug-aliases/content-slug-alias.service";
import * as FileRepository from "../files/file.repository";
import * as FileService from "../files/file.service";
import { toPublicVideoDto } from "../public-content.dto";
import { invalidatePublicContentAfterCommit } from "../public-content-cache/cache-invalidation.service";
import * as VideoCategoryRepository from "../video-categories/video-category.repository";
import * as VideoRepository from "./video.repository";

const MODEL = "Video" as const;

type TVideoStatusValue = "draft" | "pending" | "published" | "archived";

export type TVideoPayload = {
  name: string;
  slug?: string;
  description?: string;
  keywords?: string[];
  thumbnail?: string | null;
  category: string;
  author: string;
  aspect_ratio?: VideoAspectRatio;
  source_type: VideoSourceType;
  video_file?: string | null;
  youtube_url?: string | null;
  duration_seconds?: number | null;
  status?: TVideoStatusValue;
  is_featured?: boolean;
  published_at?: Date | string;
  expired_at?: Date | string | null;
  layout?: string;
};

const invalidatePublishedComposition = async (): Promise<void> => {
  try {
    await invalidatePublicContentAfterCommit("video");
  } catch {
    console.error("video_public_cache_intent_failed", {
      error_code: "cache_intent_failed",
    });
  }
};

const assertActiveCategory = async (categoryId: string): Promise<void> => {
  const category = await VideoCategoryRepository.findById(categoryId);
  if (!category || category.status !== "active") {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "An active video category is required"
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

type TResolvedSource = {
  source_type: VideoSourceType;
  video_file: string | null;
  youtube_url: string | null;
  youtube_id: string | null;
};

/**
 * Normalises whichever source the editor picked into the one stored shape:
 * a canonical YouTube link plus its id, or an uploaded file reference, never
 * both.
 */
export const resolveVideoSource = (input: {
  source_type: VideoSourceType;
  video_file?: unknown;
  youtube_url?: string | null;
}): TResolvedSource => {
  if (input.source_type === "youtube") {
    const id = parseYouTubeVideoId(input.youtube_url);
    if (!id) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "Enter a valid YouTube video link"
      );
    }
    return {
      source_type: "youtube",
      video_file: null,
      youtube_url: toCanonicalYouTubeUrl(id),
      youtube_id: id,
    };
  }
  const file = toIdString(input.video_file);
  if (!file) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "An uploaded video file is required"
    );
  }
  return {
    source_type: "upload",
    video_file: file,
    youtube_url: null,
    youtube_id: null,
  };
};

const assertVideoPublishable = (
  candidate: Parameters<typeof getVideoPublishReadiness>[0]
): void => {
  const missing = getVideoPublishReadiness(candidate);
  if (missing.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `Video is not publishable; complete: ${missing.join(", ")}`
    );
  }
};

/** A file that Cloudinary/GCS reported a duration for supplies it for free. */
const deriveUploadedDuration = async (
  fileId: string | null
): Promise<number | undefined> => {
  if (!fileId) return undefined;
  const [file] = await FileRepository.findAttachableByIds(
    [fileId],
    ["video_file"]
  );
  const duration = Number(file?.metadata?.duration);
  return Number.isFinite(duration) && duration > 0
    ? Math.round(duration)
    : undefined;
};

export const getVideos = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  return await VideoRepository.findPaginated(queryParams);
};

export const getPublicVideos = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  const result = await VideoRepository.findPublicPaginated(
    withPublicPagination(queryParams)
  );
  return { ...result, data: result.data.map(toPublicVideoDto) };
};

/**
 * Public listing used by the API and by the Videos page lanes. It resolves a
 * category slug to its id and keeps only videos whose source still resolves.
 */
export const getPublicVideoDiscovery = async (
  queryParams: Record<string, unknown>
) => {
  await connectDB();
  const query = parseVideoApiQuery(
    queryParams as Record<string, string | number | null | undefined>
  );
  const category =
    query.category === "all"
      ? null
      : await VideoCategoryRepository.findPublicByIdentifierPopulated(
          query.category
        );
  const composition = normalizeVideoDiscoveryCompositionFilter({
    featured: queryParams.composition_featured,
  });
  const result = await VideoRepository.findPublicPaginated(
    buildVideoApiRepositoryQuery(query, category?._id?.toString(), composition)
  );
  return {
    ...result,
    data: result.data
      .filter(
        (record) =>
          record.category &&
          record.author &&
          VideoRepository.hasPlayableSource(record)
      )
      .map(toPublicVideoDto),
    query:
      category?.slug && category.slug !== query.category
        ? { ...query, category: category.slug }
        : query,
  };
};

export const getVideoById = async (id: string) => {
  await connectDB();

  const video = await VideoRepository.findByIdPopulated(id);
  if (!video) {
    throw new AppError(httpStatus.NOT_FOUND, "Video not found");
  }

  return video;
};

export const getPublicVideoByIdentifier = async (identifier: string) => {
  await connectDB();

  const video = await VideoRepository.findPublicByIdentifierPopulated(identifier);
  if (!video) {
    throw new AppError(httpStatus.NOT_FOUND, "Video not found");
  }

  return toPublicVideoDto(video);
};

export const getPublicVideoById = getPublicVideoByIdentifier;

export const getPublicVideosForComposition = async (input: {
  ids?: readonly string[];
  limit: number;
  filters: Readonly<Record<string, string | boolean>>;
}) => {
  await connectDB();
  const records = await VideoRepository.findPublicForComposition(input);
  return records.map(toPublicVideoDto);
};

export const createVideo = async (payload: TVideoPayload, actor?: TJwtPayload) => {
  const db = await connectDB();
  await assertActiveCategory(payload.category);

  const source = resolveVideoSource(payload);
  await FileService.validateFileIds(
    payload.thumbnail ? [payload.thumbnail] : [],
    ["video"],
    actor
  );
  if (source.video_file) {
    await FileService.validateFileIds([source.video_file], ["video_file"], actor);
  }

  const status = payload.status || "draft";
  const aspect_ratio = payload.aspect_ratio ?? "landscape";
  if (status === "published") {
    assertVideoPublishable({ ...source, aspect_ratio });
  }
  const published_at =
    status === "published" ? payload.published_at || new Date() : undefined;
  const expired_at = payload.expired_at
    ? new Date(payload.expired_at)
    : undefined;
  const duration_seconds =
    payload.duration_seconds ??
    (await deriveUploadedDuration(source.video_file));

  const entityId = new Types.ObjectId().toString();
  const slug = await allocateContentSlug({
    scope: "video",
    requested: payload.slug || payload.name,
    fallback: "video",
    target: entityId,
  });

  let created: Awaited<ReturnType<typeof VideoRepository.create>> | undefined;
  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      created = await VideoRepository.create(
        {
          name: payload.name,
          description: payload.description,
          thumbnail: payload.thumbnail ?? null,
          category: payload.category,
          author: payload.author,
          layout: payload.layout || "default",
          ...source,
          _id: entityId,
          slug,
          slug_history: [],
          keywords: normalizeVideoKeywords(payload.keywords),
          aspect_ratio,
          ...(duration_seconds === undefined ? {} : { duration_seconds }),
          status,
          published_at,
          expired_at,
          is_featured: payload.is_featured || false,
        } as never,
        session
      );
      await reserveContentSlug({
        scope: "video",
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
      if (source.video_file) {
        await FileService.attachToEntity({
          fileIds: source.video_file,
          model: MODEL,
          entity: entityId,
          field: "video_file",
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
      "Video could not be committed"
    );
  }
  const result = (await VideoRepository.findByIdPopulated(entityId)) || created;
  await invalidatePublishedComposition();
  return result;
};

export const updateVideoById = async (
  id: string,
  payload: Partial<Omit<TVideoPayload, "author">>,
  actor?: TJwtPayload
) => {
  const db = await connectDB();

  const video = await VideoRepository.findById(id);
  if (!video) {
    throw new AppError(httpStatus.NOT_FOUND, "Video not found");
  }

  if (payload.category) await assertActiveCategory(payload.category);

  const sourceTouched =
    payload.source_type !== undefined ||
    payload.youtube_url !== undefined ||
    payload.video_file !== undefined;
  const nextSourceType = payload.source_type ?? video.source_type;
  const source = sourceTouched
    ? resolveVideoSource({
        source_type: nextSourceType,
        youtube_url:
          payload.youtube_url !== undefined
            ? payload.youtube_url
            : nextSourceType === "youtube"
              ? video.youtube_url
              : undefined,
        video_file:
          payload.video_file !== undefined
            ? payload.video_file
            : nextSourceType === "upload"
              ? video.video_file
              : undefined,
      })
    : undefined;

  await FileService.validateFileIds(
    payload.thumbnail ? [payload.thumbnail] : [],
    ["video"],
    actor
  );
  if (source?.video_file) {
    await FileService.validateFileIds([source.video_file], ["video_file"], actor);
  }

  const previousThumbnail = toIdString(video.thumbnail);
  const previousFile = toIdString(video.video_file);

  const {
    thumbnail: _thumbnail,
    video_file: _videoFile,
    youtube_url: _youtubeUrl,
    source_type: _sourceType,
    keywords,
    ...rest
  } = payload;
  const updateData: Record<string, unknown> = { ...rest };
  if (keywords !== undefined) {
    updateData.keywords = normalizeVideoKeywords(keywords);
  }
  if (payload.thumbnail !== undefined) {
    updateData.thumbnail = payload.thumbnail;
  }
  if (source) {
    updateData.source_type = source.source_type;
    updateData.video_file = source.video_file;
    updateData.youtube_url = source.youtube_url ?? undefined;
    updateData.youtube_id = source.youtube_id ?? undefined;
    if (
      payload.duration_seconds === undefined &&
      source.video_file &&
      source.video_file !== previousFile
    ) {
      const derived = await deriveUploadedDuration(source.video_file);
      if (derived !== undefined) updateData.duration_seconds = derived;
    }
  }
  if (payload.duration_seconds === null) {
    updateData.duration_seconds = undefined;
  }

  if (payload.status === "published" && video.status !== "published") {
    assertVideoPublishable({
      aspect_ratio: payload.aspect_ratio ?? video.aspect_ratio,
      source_type: source?.source_type ?? video.source_type,
      youtube_id: source ? source.youtube_id : video.youtube_id,
      youtube_url: source ? source.youtube_url : video.youtube_url,
      video_file: source ? source.video_file : video.video_file,
    });
  }

  const requestedSlug =
    payload.slug ?? (!video.slug ? (payload.name ?? video.name) : undefined);
  const nextSlug = requestedSlug
    ? await allocateContentSlug({
        scope: "video",
        requested: requestedSlug,
        fallback: "video",
        target: id,
      })
    : video.slug;
  if (nextSlug && nextSlug !== video.slug) {
    updateData.slug = nextSlug;
    updateData.slug_history = [
      ...(video.slug_history ?? []),
      ...(video.slug ? [{ slug: video.slug, changed_at: new Date() }] : []),
    ];
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
    updateData.published_at = video.published_at ?? new Date();
  }

  const session = await db.startSession();
  try {
    await session.withTransaction(async () => {
      if (nextSlug) {
        await reserveContentSlug({
          scope: "video",
          slug: nextSlug,
          target: id,
          session,
        });
      }
      Object.assign(video, updateData);
      await video.save({ session });

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
      if (source) {
        await FileService.reconcileEntityRefs({
          model: MODEL,
          entity: id,
          field: "video_file",
          previous: previousFile,
          next: source.video_file,
          actor,
          session,
        });
      }
    });
  } finally {
    await session.endSession();
  }

  const result = await VideoRepository.findByIdPopulated(id);
  await invalidatePublishedComposition();
  return result;
};

export const updateVideos = async (
  ids: string[],
  payload: Partial<{
    status: TVideoStatusValue;
    is_featured: boolean;
    category: string;
  }>
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  if (payload.category) await assertActiveCategory(payload.category);
  const videos = await VideoRepository.findManyByIds(ids);
  const foundIds = videos.map((video) => video._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  if (payload.status === "published") {
    const incompleteIds = videos
      .filter(
        (video) =>
          video.status !== "published" &&
          getVideoPublishReadiness(video).length > 0
      )
      .map((video) => video._id.toString());
    if (incompleteIds.length) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Videos are not publishable until their source is complete: ${incompleteIds.join(", ")}`
      );
    }
    await VideoRepository.setPublishedAtIfMissing(foundIds, new Date());
  }

  const result = await VideoRepository.updateMany(foundIds, payload as never);
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteVideoById = async (id: string) => {
  await connectDB();

  const video = await VideoRepository.softDeleteById(id);
  if (!video) {
    throw new AppError(httpStatus.NOT_FOUND, "Video not found");
  }

  await invalidatePublishedComposition();

  return null;
};

export const deleteVideoPermanentById = async (id: string): Promise<void> => {
  await connectDB();

  const video = await VideoRepository.findDeletedById(id);
  if (!video) {
    throw new AppError(httpStatus.NOT_FOUND, "Video not found");
  }

  const deleted = await VideoRepository.hardDeleteById(id);
  if (!deleted) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Video changed while permanent deletion was in progress"
    );
  }

  await FileService.detachAllForEntity({ model: MODEL, entity: id });
  await invalidatePublishedComposition();
};

export const deleteVideos = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const videos = await VideoRepository.findManyByIds(ids);
  const foundIds = videos.map((video) => video._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await VideoRepository.softDeleteMany(foundIds);
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteVideosPermanent = async (
  ids: string[]
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const videos = await VideoRepository.findDeletedManyByIds(ids);
  const foundIds = videos.map((video) => video._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const outcomes = await Promise.all(
    foundIds.map(async (entityId) => {
      const deleted = await VideoRepository.hardDeleteById(entityId);
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

export const restoreVideoById = async (id: string) => {
  await connectDB();

  const candidate = await VideoRepository.findDeletedById(id);
  if (!candidate) {
    throw new AppError(httpStatus.NOT_FOUND, "Video not found or not deleted");
  }

  const notRestorableIds = await VideoRepository.findNotRestorableIds([
    candidate,
  ]);
  if (notRestorableIds.length) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Video cannot be restored until its category and author are active"
    );
  }

  const video = await VideoRepository.restoreById(id);
  if (!video) {
    throw new AppError(
      httpStatus.CONFLICT,
      "Video changed while restoration was in progress"
    );
  }

  await invalidatePublishedComposition();

  return video;
};

export const restoreVideos = async (
  ids: string[]
): Promise<{
  count: number;
  not_found_ids: string[];
  not_restorable_ids: string[];
}> => {
  await connectDB();

  const videos = await VideoRepository.findDeletedManyByIds(ids);
  const foundIds = videos.map((video) => video._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));
  const notRestorableIds = await VideoRepository.findNotRestorableIds(videos);
  const notRestorableSet = new Set(notRestorableIds);
  const restorableIds = foundIds.filter((id) => !notRestorableSet.has(id));
  const result = restorableIds.length
    ? await VideoRepository.restoreMany(restorableIds)
    : { modifiedCount: 0 };
  if (result.modifiedCount) await invalidatePublishedComposition();

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
    not_restorable_ids: notRestorableIds,
  };
};
