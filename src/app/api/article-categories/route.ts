import { errorHandler } from '@/utils/errorHandler';
import * as ArticleCategoryController from './article-category.controller';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await ArticleCategoryController.getArticleCategories(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
