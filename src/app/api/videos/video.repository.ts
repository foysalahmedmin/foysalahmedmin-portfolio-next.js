import AppQuery from "@/builder/app-query";
import { isMongoObjectId, normalizeSlugIdentifier } from "@/lib/content/slug";
import { parseSoftDeleteScope, setSoftDeleteScope } from "@/lib/db/soft-delete";
import { VIDEO_ASPECT_RATIOS } from "@/lib/content/video-contract";
import type { ClientSession } from "mongoose";
import { findSlugTarget } from "../content-slug-aliases/content-slug-alias.service";
import {
  getPublicCategoryFilter,
  getPublicVideoFilter,
  withPublicCategories,
} from "../public-visibility";
import { User } from "../users/user.model";
import VideoCategory from "../video-categories/video-category.model";
import Video from "./video.model";
import type { TVideo, TVideoDocument } from "./video.type";

const FILE_SELECT = "_id url filename mimetype size provider metadata";
const PUBLIC_FILE_SELECT =
  "_id url mimetype metadata.width metadata.height metadata.duration metadata.format alt_text caption focal_point dominant_color blur_data_url is_decorative";

const POPULATE_FIELDS = [
  {
    path: "author",
    select: "_id name email image",
    populate: { path: "image", select: FILE_SELECT },
  },
  { path: "category", select: "_id name slug" },
  { path: "thumbnail", select: FILE_SELECT },
  { path: "video_file", select: FILE_SELECT },
];

const PUBLIC_POPULATE_FIELDS = [
  {
    path: "author",
    select: "_id name",
    match: { status: "in-progress" },
  },
  {
    path: "category",
    match: { status: "active" },
    select: "_id name slug",
  },
  {
    path: "thumbnail",
    match: {
      status: "active",
      lifecycle_state: "ready",
      access: "public",
      purpose: "video",
    },
    select: PUBLIC_FILE_SELECT,
  },
  {
    path: "video_file",
    match: {
      status: "active",
      lifecycle_state: "ready",
      access: "public",
      purpose: "video_file",
    },
    select: PUBLIC_FILE_SELECT,
  },
];

const toIdString = (value: unknown): string =>
  (value as { toString(): string }).toString();

const uniqueIds = (values: unknown[]): string[] => [
  ...new Set(values.filter(Boolean).map(toIdString)),
];

export const PUBLIC_VIDEO_LIST_FIELDS: Array<keyof TVideo> = [
  "name",
  "slug",
  "description",
  "keywords",
  "thumbnail",
  "category",
  "author",
  "aspect_ratio",
  "source_type",
  "video_file",
  "youtube_url",
  "youtube_id",
  "duration_seconds",
  "status",
  "is_featured",
  "published_at",
  "updated_at",
];

export const PUBLIC_VIDEO_DETAIL_FIELDS: Array<keyof TVideo> = [
  ...PUBLIC_VIDEO_LIST_FIELDS,
  "expired_at",
  "layout",
];

/**
 * A published Video is only publicly playable when its source resolves: a
 * YouTube id, or an uploaded file that is still public and ready.
 */
export const hasPlayableSource = (record: {
  source_type?: unknown;
  youtube_id?: unknown;
  video_file?: unknown;
}): boolean =>
  record.source_type === "youtube"
    ? Boolean(record.youtube_id)
    : record.source_type === "upload"
      ? Boolean(record.video_file)
      : false;

const PLAYABLE_SOURCE_FILTER = {
  $or: [
    { source_type: "youtube", youtube_id: { $type: "string" } },
    { source_type: "upload", video_file: { $type: "objectId" } },
  ],
};

const getPublicVideoRepositoryFilter = async () => {
  const categories = await VideoCategory.find(getPublicCategoryFilter())
    .select("_id")
    .lean();

  return {
    $and: [
      withPublicCategories(
        getPublicVideoFilter(),
        categories.map((category) => category._id)
      ),
      PLAYABLE_SOURCE_FILTER,
    ],
  };
};

export const create = async (
  data: Partial<TVideo>,
  session?: ClientSession
): Promise<TVideoDocument> => {
  const created = session
    ? (await Video.create([data], { session }))[0]!
    : await Video.create(data);
  if (session) return created;
  return await created.populate(POPULATE_FIELDS);
};

export const findById = async (id: string): Promise<TVideoDocument | null> =>
  await Video.findById(id);

export const findByIdPopulated = async (id: string) =>
  await Video.findById(id).populate(POPULATE_FIELDS).lean();

export const findPublicByIdentifierPopulated = async (identifier: string) => {
  const publicFilter = await getPublicVideoRepositoryFilter();
  const normalized = normalizeSlugIdentifier(identifier);
  if (!normalized) return null;
  const identityFilter = isMongoObjectId(identifier)
    ? { $or: [{ _id: identifier }, { slug: normalized }] }
    : { $or: [{ slug: normalized }, { "slug_history.slug": normalized }] };

  const direct = await Video.findOne({ $and: [publicFilter, identityFilter] })
    .select(PUBLIC_VIDEO_DETAIL_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .lean();
  const found =
    direct ??
    (await (async () => {
      const aliasTarget = await findSlugTarget("video", normalized);
      if (!aliasTarget) return null;
      return await Video.findOne({
        $and: [publicFilter, { _id: aliasTarget }],
      })
        .select(PUBLIC_VIDEO_DETAIL_FIELDS.join(" "))
        .populate(PUBLIC_POPULATE_FIELDS)
        .lean();
    })());
  return found && found.category && found.author && hasPlayableSource(found)
    ? found
    : null;
};

export const findPublicByIdPopulated = findPublicByIdentifierPopulated;

export const findPublicForComposition = async (input: {
  ids?: readonly string[];
  limit: number;
  filters: Readonly<Record<string, string | boolean>>;
}) => {
  const publicFilter = await getPublicVideoRepositoryFilter();
  const filter: Record<string, unknown> = { ...publicFilter };
  if (input.ids?.length) filter._id = { $in: input.ids };
  if (typeof input.filters.featured === "boolean") {
    filter.is_featured = input.filters.featured;
  }
  if (
    typeof input.filters.aspect_ratio === "string" &&
    VIDEO_ASPECT_RATIOS.includes(
      input.filters.aspect_ratio as (typeof VIDEO_ASPECT_RATIOS)[number]
    )
  ) {
    filter.aspect_ratio = input.filters.aspect_ratio;
  }
  const records = await setSoftDeleteScope(Video.find(filter), "active", {
    exact_active: true,
  })
    .select(PUBLIC_VIDEO_LIST_FIELDS.join(" "))
    .populate(PUBLIC_POPULATE_FIELDS)
    .sort({ is_featured: -1, published_at: -1, _id: 1 })
    .limit(Math.min(24, Math.max(1, input.limit)))
    .lean();
  const eligible = records.filter(
    (record) => record.category && record.author && hasPlayableSource(record)
  );
  if (!input.ids?.length) return eligible;
  const byId = new Map(
    eligible.map((record) => [record._id.toString(), record] as const)
  );
  return input.ids.flatMap((recordId) => {
    const record = byId.get(recordId);
    return record ? [record] : [];
  });
};

export const findByIdWithDeleted = async (
  id: string
): Promise<TVideoDocument | null> =>
  await setSoftDeleteScope(Video.findById(id), "with_deleted");

export const findDeletedById = async (
  id: string
): Promise<TVideoDocument | null> =>
  await setSoftDeleteScope(Video.findById(id), "only_deleted");

export const findManyByIds = async (ids: string[]) =>
  await Video.find({ _id: { $in: ids } }).lean();

export const findDeletedManyByIds = async (ids: string[]) =>
  await setSoftDeleteScope(
    Video.find({ _id: { $in: ids } }),
    "only_deleted"
  ).lean();

export const findNotRestorableIds = async (
  videos: Array<Pick<TVideo, "category" | "author"> & { _id: unknown }>
): Promise<string[]> => {
  if (!videos.length) return [];

  const categoryIds = uniqueIds(videos.map(({ category }) => category));
  const userIds = uniqueIds(videos.map(({ author }) => author));

  const [categories, users] = await Promise.all([
    VideoCategory.find({ _id: { $in: categoryIds }, status: "active" })
      .select("_id")
      .lean(),
    User.find({ _id: { $in: userIds }, status: "in-progress" })
      .select("_id")
      .lean(),
  ]);

  const activeCategoryIds = new Set(
    categories.map(({ _id }) => _id.toString())
  );
  const activeUserIds = new Set(users.map(({ _id }) => _id.toString()));

  return videos
    .filter(
      ({ category, author }) =>
        !activeCategoryIds.has(toIdString(category)) ||
        !activeUserIds.has(toIdString(author))
    )
    .map(({ _id }) => toIdString(_id));
};

export const findPaginated = async (queryParams: Record<string, unknown>) => {
  const scope = parseSoftDeleteScope(queryParams.deleted_scope);
  const query = new AppQuery<TVideoDocument>(
    setSoftDeleteScope(Video.find(), scope),
    queryParams
  );

  return await query
    .search(["name", "description", "keywords"])
    .filter([
      "status",
      "category",
      "author",
      "is_featured",
      "aspect_ratio",
      "source_type",
    ])
    .sort(["name", "status", "published_at", "created_at"])
    .paginate()
    .fields()
    .tap((videoQuery) => videoQuery.populate(POPULATE_FIELDS).lean())
    .execute();
};

export const findPublicPaginated = async (
  queryParams: Record<string, unknown>
) => {
  const publicFilter = await getPublicVideoRepositoryFilter();
  const query = new AppQuery<TVideoDocument>(Video.find(publicFilter), {
    ...queryParams,
    status: "published",
  });

  return await query
    .search(["name", "description", "keywords"])
    .filter(["status", "category", "is_featured", "aspect_ratio"])
    .sort(["name", "status", "published_at", "is_featured", "_id"])
    .paginate()
    .fields(PUBLIC_VIDEO_LIST_FIELDS)
    .tap((videoQuery) => videoQuery.populate(PUBLIC_POPULATE_FIELDS).lean())
    .execute();
};

export const updateMany = async (ids: string[], payload: Partial<TVideo>) =>
  await Video.updateMany({ _id: { $in: ids } }, { ...payload });

export const setPublishedAtIfMissing = async (ids: string[], now: Date) =>
  Video.updateMany(
    {
      _id: { $in: ids },
      $or: [{ published_at: { $exists: false } }, { published_at: null }],
    },
    { $set: { published_at: now } }
  );

export const softDeleteMany = async (ids: string[]) =>
  await Video.updateMany(
    { _id: { $in: ids } },
    { is_deleted: true, deleted_at: new Date() }
  );

export const softDeleteById = async (id: string) =>
  await Video.findByIdAndUpdate(
    id,
    { is_deleted: true, deleted_at: new Date() },
    { new: true, runValidators: false }
  );

export const restoreById = async (id: string) =>
  await setSoftDeleteScope(
    Video.findByIdAndUpdate(
      id,
      { is_deleted: false, deleted_at: null },
      { new: true }
    ),
    "only_deleted"
  );

export const restoreMany = async (ids: string[]) =>
  await setSoftDeleteScope(
    Video.updateMany(
      { _id: { $in: ids } },
      { is_deleted: false, deleted_at: null }
    ),
    "only_deleted"
  );

export const hardDeleteById = async (id: string) =>
  await setSoftDeleteScope(Video.findByIdAndDelete(id), "only_deleted");

export const hardDeleteMany = async (ids: string[]) =>
  await setSoftDeleteScope(
    Video.deleteMany({ _id: { $in: ids } }),
    "only_deleted"
  );
