import connectDB from '@/lib/db';
import Article from './article.model';
import AppError from '@/builder/app-error';
import AppQuery from '@/builder/app-query';
import httpStatus from 'http-status';
import type { TArticleDocument } from './article.type';
import { deleteFile, deleteFiles } from '@/utils/file-utils';

export const getArticles = async (queryParams: Record<string, unknown>) => {
  await connectDB();

  const query = new AppQuery<TArticleDocument>(
    Article.find(),
    queryParams,
  );

  const result = await query
    .search(['name', 'description'])
    .filter(['status', 'category', 'author', 'is_featured'])
    .sort(['name', 'status', 'published_at'])
    .paginate()
    .fields()
    .execute();

  // Populate relations
  const populatedData = await Promise.all(
    result.data.map(async (article: any) => {
      return await Article.findById(article._id)
        .populate([
          { path: 'author', select: '_id name email image' },
          { path: 'category', select: '_id name' },
          { path: 'collaborators', select: '_id name email' }
        ])
        .lean();
    }),
  );

  return {
    data: populatedData,
    meta: result.meta,
  };
};

export const getArticleById = async (id: string) => {
  await connectDB();

  const article = await Article.findById(id)
    .populate([
      { path: 'author', select: '_id name email image' },
      { path: 'category', select: '_id name' },
      { path: 'collaborators', select: '_id name email' }
    ])
    .lean();

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
    status === 'published'
      ? payload.published_at || new Date()
      : undefined;
  const expired_at =
    payload.expired_at && status === 'published'
      ? new Date(payload.expired_at)
      : undefined;

  const article = await Article.create({
    ...payload,
    status,
    published_at,
    expired_at,
    is_featured: payload.is_featured || false,
    is_premium: payload.is_premium || false,
    layout: payload.layout || 'default',
  });

  return await article.populate([
    { path: 'author', select: '_id name email' },
    { path: 'category', select: '_id name' },
    { path: 'collaborators', select: '_id name email' }
  ]);
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

  const article = await Article.findById(id);

  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  // Get current article data if not provided
  const current = currentArticle || article.toObject();

  // Handle file deletion/replacement
  // Delete old thumbnail if it's being replaced or removed
  if (payload.thumbnail !== undefined) {
    if (current.thumbnail && current.thumbnail !== payload.thumbnail) {
      // Old thumbnail exists and is being changed
      deleteFile(current.thumbnail);
    }
  }

  // Handle images array - delete removed images
  if (payload.images !== undefined && Array.isArray(payload.images)) {
    const currentImages = current.images || [];
    const newImages = payload.images.filter((img) => img !== 'DELETE' && typeof img === 'string');
    
    // Find images that were removed
    const removedImages = currentImages.filter(
      (oldImg: string) => !newImages.includes(oldImg),
    );
    
    // Delete removed images
    if (removedImages.length > 0) {
      deleteFiles(removedImages);
    }
    
    // Update payload with cleaned images array
    payload.images = newImages;
  }

  // Handle date conversions
  const updateData: any = { ...payload };
  if (payload.published_at) {
    updateData.published_at = new Date(payload.published_at);
  }
  if (payload.expired_at) {
    updateData.expired_at = new Date(payload.expired_at);
  }

  // Ensure published_at present if status set to published
  if (payload.status === 'published' && !updateData.published_at) {
    updateData.published_at = new Date();
  }

  Object.assign(article, updateData);
  const savedArticle = await article.save();

  return await article.populate([
    { path: 'author', select: '_id name email' },
    { path: 'category', select: '_id name' },
    { path: 'collaborators', select: '_id name email' }
  ]);
};

export const updateArticles = async (
  ids: string[],
  payload: Partial<{
    status: 'draft' | 'pending' | 'published' | 'archived';
    is_featured: boolean;
    category: string;
  }>,
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const articles = await Article.find({ _id: { $in: ids } }).lean();
  const foundIds = articles.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  const result = await Article.updateMany(
    { _id: { $in: foundIds } },
    { ...payload },
  );

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};

export const deleteArticleById = async (id: string) => {
  await connectDB();

  const article = await Article.findById(id);

  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  await article.softDelete();

  return null;
};

export const deleteArticlePermanentById = async (id: string): Promise<void> => {
  await connectDB();
  const article = await Article.findById(id).setOptions({ bypassDeleted: true });
  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  // Delete associated files
  if (article.thumbnail) {
    deleteFile(article.thumbnail);
  }
  if (article.images && article.images.length > 0) {
    deleteFiles(article.images);
  }

  await Article.findByIdAndDelete(id);
};

export const deleteArticles = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const articles = await Article.find({ _id: { $in: ids } }).lean();
  const foundIds = articles.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  await Article.updateMany(
    { _id: { $in: foundIds } },
    { is_deleted: true },
  );

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const deleteArticlesPermanent = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const articles = await Article.find({ _id: { $in: ids } }).lean();
  const foundIds = articles.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !foundIds.includes(id));

  // Delete all associated files
  for (const article of articles) {
    if (article.thumbnail) {
      deleteFile(article.thumbnail);
    }
    if (article.images && article.images.length > 0) {
      deleteFiles(article.images);
    }
  }

  await Article.deleteMany({ _id: { $in: foundIds } }).setOptions({
    bypassDeleted: true,
  });

  return {
    count: foundIds.length,
    not_found_ids: notFoundIds,
  };
};

export const restoreArticleById = async (id: string) => {
  await connectDB();
  const article = await Article.findByIdAndUpdate(
    id,
    { is_deleted: false },
    { new: true },
  );

  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found or not deleted');
  }

  return article;
};

export const restoreArticles = async (
  ids: string[],
): Promise<{
  count: number;
  not_found_ids: string[];
}> => {
  await connectDB();
  const result = await Article.updateMany(
    { _id: { $in: ids }, is_deleted: true },
    { is_deleted: false },
  );

  const restoredArticles = await Article.find({ _id: { $in: ids } }).lean();
  const restoredIds = restoredArticles.map((article) => article._id.toString());
  const notFoundIds = ids.filter((id) => !restoredIds.includes(id));

  return {
    count: result.modifiedCount,
    not_found_ids: notFoundIds,
  };
};
