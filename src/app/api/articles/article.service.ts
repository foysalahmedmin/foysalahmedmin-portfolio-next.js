import AppError from '@/builder/app-error';
import connectDB from '@/lib/db';
import { withPublicPagination } from '@/utils/public-query';
import httpStatus from 'http-status';
import * as FileService from '../files/file.service';
import * as ArticleRepository from './article.repository';

const MODEL = 'Article' as const;

const toIdString = (value: unknown): string | null => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object' && value !== null) {
    const obj = value as { _id?: { toString(): string }; toString?(): string };
    if (obj._id) return obj._id.toString();
    if (obj.toString) return obj.toString();
  }
  return null;
};

const toIdArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => toIdString(v))
    .filter((v): v is string => Boolean(v));
};

export const getArticles = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  return await ArticleRepository.findPaginated(queryParams);
};

export const getPublicArticles = async (
  queryParams: Record<string, unknown>,
) => {
  await connectDB();
  return await ArticleRepository.findPublicPaginated(
    withPublicPagination(queryParams),
  );
};

export const getArticleById = async (id: string) => {
  await connectDB();

  const article = await ArticleRepository.findByIdPopulated(id);
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  return article;
};

export const getPublicArticleById = async (id: string) => {
  await connectDB();

  const article = await ArticleRepository.findPublicByIdPopulated(id);
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  return article;
};

export const createArticle = async (payload: {
  name: string;
  content: string;
  category: string;
  author: string;
  description?: string;
  thumbnail?: string | null;
  images?: string[];
  tags?: string[];
  collaborators?: string[];
  status?: 'draft' | 'pending' | 'published' | 'archived';
  is_featured?: boolean;
  is_premium?: boolean;
  published_at?: Date;
  expired_at?: Date;
  layout?: string;
}) => {
  await connectDB();

  const fileIds = [
    ...(payload.thumbnail ? [payload.thumbnail] : []),
    ...(payload.images ?? []),
  ];
  await FileService.validateFileIds(fileIds);

  const status = payload.status || 'draft';
  const published_at =
    status === 'published' ? payload.published_at || new Date() : undefined;
  const expired_at =
    payload.expired_at && status === 'published'
      ? new Date(payload.expired_at)
      : undefined;

  const created = await ArticleRepository.create({
    ...payload,
    status,
    published_at,
    expired_at,
    is_featured: payload.is_featured || false,
    is_premium: payload.is_premium || false,
    layout: payload.layout || 'default',
  } as never);

  const entityId = (created._id as { toString(): string }).toString();

  await Promise.all([
    payload.thumbnail
      ? FileService.attachToEntity({
          fileIds: payload.thumbnail,
          model: MODEL,
          entity: entityId,
          field: 'thumbnail',
        })
      : Promise.resolve(),
    payload.images?.length
      ? FileService.attachToEntity({
          fileIds: payload.images,
          model: MODEL,
          entity: entityId,
          field: 'images',
        })
      : Promise.resolve(),
  ]);

  return created;
};

export const updateArticleById = async (
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    content: string;
    thumbnail: string | null;
    images: string[];
    tags: string[];
    category: string;
    collaborators: string[];
    status: 'draft' | 'pending' | 'published' | 'archived';
    is_featured: boolean;
    is_premium: boolean;
    published_at: Date | string;
    expired_at: Date | string;
    layout: string;
  }>,
) => {
  await connectDB();

  const article = await ArticleRepository.findById(id);
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  const newFileIds = [
    ...(payload.thumbnail ? [payload.thumbnail] : []),
    ...(payload.images ?? []),
  ];
  await FileService.validateFileIds(newFileIds);

  const previousThumbnail = toIdString(article.thumbnail);
  const previousImages = toIdArray(article.images);

  const updateData: Record<string, unknown> = { ...payload };
  if (payload.published_at) {
    updateData.published_at = new Date(payload.published_at);
  }
  if (payload.expired_at) {
    updateData.expired_at = new Date(payload.expired_at);
  }
  if (payload.status === 'published' && !updateData.published_at) {
    updateData.published_at = new Date();
  }

  Object.assign(article, updateData);
  await article.save();

  const reconcileTasks: Promise<void>[] = [];

  if (payload.thumbnail !== undefined) {
    reconcileTasks.push(
      FileService.reconcileEntityRefs({
        model: MODEL,
        entity: id,
        field: 'thumbnail',
        previous: previousThumbnail,
        next: payload.thumbnail,
      }),
    );
  }

  if (payload.images !== undefined) {
    reconcileTasks.push(
      FileService.reconcileEntityRefs({
        model: MODEL,
        entity: id,
        field: 'images',
        previous: previousImages,
        next: payload.images,
      }),
    );
  }

  await Promise.all(reconcileTasks);

  return await ArticleRepository.findByIdPopulated(id);
};

export const updateArticles = async (
  ids: string[],
  payload: Partial<{
    status: 'draft' | 'pending' | 'published' | 'archived';
    is_featured: boolean;
    category: string;
  }>,
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const articles = await ArticleRepository.findManyByIds(ids);
  const foundIds = articles.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await ArticleRepository.updateMany(foundIds, payload as never);

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteArticleById = async (id: string) => {
  await connectDB();

  const article = await ArticleRepository.findById(id);
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  await article.softDelete();
  return null;
};

export const deleteArticlePermanentById = async (id: string): Promise<void> => {
  await connectDB();

  const article = await ArticleRepository.findByIdWithDeleted(id);
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  await FileService.detachAllForEntity({ model: MODEL, entity: id });
  await ArticleRepository.hardDeleteById(id);
};

export const deleteArticles = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const articles = await ArticleRepository.findManyByIds(ids);
  const foundIds = articles.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await ArticleRepository.softDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteArticlesPermanent = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();
  const articles = await ArticleRepository.findManyByIds(ids);
  const foundIds = articles.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await Promise.all(
    foundIds.map((entityId) =>
      FileService.detachAllForEntity({ model: MODEL, entity: entityId }),
    ),
  );

  await ArticleRepository.hardDeleteMany(foundIds);

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreArticleById = async (id: string) => {
  await connectDB();

  const article = await ArticleRepository.restoreById(id);
  if (!article) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      'Article not found or not deleted',
    );
  }

  return article;
};

export const restoreArticles = async (
  ids: string[],
): Promise<{ count: number; not_found_ids: string[] }> => {
  await connectDB();

  const result = await ArticleRepository.restoreMany(ids);

  const restored = await ArticleRepository.findManyByIds(ids);
  const restoredIds = restored.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};
