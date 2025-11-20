import connectDB from '@/lib/db';
import Article from './article.model';
import AppError from '@/builder/AppError';
import AppQuery from '@/builder/AppQuery';
import httpStatus from 'http-status';
import { TArticleDocument } from './article.type';

export const getArticles = async (queryParams: Record<string, unknown>) => {
  await connectDB();

  const query = new AppQuery<TArticleDocument>(
    Article.find(),
    queryParams,
  );

  const result = await query
    .search(['name', 'slug', 'description'])
    .filter(['status', 'category', 'author'])
    .sort(['name', 'status', 'published_at'])
    .paginate()
    .fields()
    .execute();

  // Populate relations
  const populatedData = await Promise.all(
    result.data.map(async (article: any) => {
      return await Article.findById(article._id)
        .populate('author', 'name email')
        .populate('category', 'name slug')
        .populate('collaborators', 'name email')
        .lean();
    }),
  );

  return {
    data: populatedData,
    meta: result.meta,
  };
};

export const getArticleBySlug = async (slug: string) => {
  await connectDB();

  const article = await Article.findOne({ slug })
    .populate('author', 'name email')
    .populate('category', 'name slug')
    .populate('collaborators', 'name email')
    .lean();

  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  return article;
};

export const createArticle = async (payload: {
  name: string;
  slug: string;
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

  const existingArticle = await Article.findOne({ slug: payload.slug });

  if (existingArticle) {
    throw new AppError(
      httpStatus.CONFLICT,
      'Article with this slug already exists',
    );
  }

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

  return await article
    .populate('author', 'name email')
    .populate('category', 'name slug')
    .populate('collaborators', 'name email');
};

export const updateArticleBySlug = async (
  slug: string,
  payload: Partial<{
    name: string;
    slug: string;
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
) => {
  await connectDB();

  const article = await Article.findOne({ slug });

  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  // Check if new slug conflicts with existing article
  if (payload.slug && payload.slug !== slug) {
    const existingArticle = await Article.findOne({ slug: payload.slug });
    if (existingArticle) {
      throw new AppError(
        httpStatus.CONFLICT,
        'Article with this slug already exists',
      );
    }
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
  await article.save();

  return await article
    .populate('author', 'name email')
    .populate('category', 'name slug')
    .populate('collaborators', 'name email');
};

export const deleteArticleBySlug = async (slug: string) => {
  await connectDB();

  const article = await Article.findOne({ slug });

  if (!article) {
    throw new AppError(httpStatus.NOT_FOUND, 'Article not found');
  }

  await article.softDelete();

  return null;
};

