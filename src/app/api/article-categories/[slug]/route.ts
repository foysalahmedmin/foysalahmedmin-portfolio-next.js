import { errorHandler } from '@/utils/error-handler';
import * as ArticleCategoryController from '../article-category.controller';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    return await ArticleCategoryController.getArticleCategoryBySlug(req, {
      params,
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
