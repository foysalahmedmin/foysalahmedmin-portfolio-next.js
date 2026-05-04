import AppError from '@/builder/app-error';
import connectDB from '@/lib/db';
import { deleteFile, deleteFiles } from '@/utils/file-utils';
import httpStatus from 'http-status';
import * as ArticleRepository from './article.repository';

export const getArticles = async (queryParams: Record<string, unknown>) => {
  await connectDB();
  return await ArticleRepository.findPaginated(queryParams);
};

export const getArticleById = async (id: string) => {
  await connectDB();

  const article = await ArticleRepository.findByIdPopulated(id);
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
  thumbnail?: string;
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

  const status = payload.status || 'draft';
  const published_at =
    status === 'published' ? payload.published_at || new Date() : undefined;
  const expired_at =
    payload.expired_at && status === 'published'
      ? new Date(payload.expired_at)
      : undefined;

  return await ArticleRepository.create({
    ...payload,
    status,
    published_at,
    expired_at,
    is_featured: payload.is_featured || false,
    is_premium: payload.is_premium || false,
    layout: payload.layout || 'default',
  } as never);
};

export const updateArticleById = async (
  id: string,
  payload: Partial<{
    name: string;
    description: string;
    content: string;
    thumbnail: string;
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
  currentArticle?: any,
) => {
  await connectDB();

  const article = await ArticleRepository.findById(id);
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  const current = currentArticle || article.toObject();

  if (payload.thumbnail !== undefined) {
    if (current.thumbnail && current.thumbnail !== payload.thumbnail) {
      deleteFile(current.thumbnail);
    }
  }

  if (payload.images !== undefined && Array.isArray(payload.images)) {
    const currentImages = current.images || [];
    const newImages = payload.images.filter(
      (img) => img !== 'DELETE' && typeof img === 'string',
    );

    const removedImages = currentImages.filter(
      (oldImg: string) => !newImages.includes(oldImg),
    );

    if (removedImages.length > 0) {
      deleteFiles(removedImages);
    }

    payload.images = newImages;
  }

  const updateData: any = { ...payload };
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

  return await article.populate([
    { path: 'author', select: '_id name email' },
    { path: 'category', select: '_id name' },
    { path: 'collaborators', select: '_id name email' },
  ]);
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

  if (article.thumbnail) {
    deleteFile(article.thumbnail);
  }
  if (article.images && article.images.length > 0) {
    deleteFiles(article.images);
  }

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

  for (const article of articles) {
    if (article.thumbnail) {
      deleteFile(article.thumbnail);
    }
    if (article.images && article.images.length > 0) {
      deleteFiles(article.images);
    }
  }

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
