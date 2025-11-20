import { errorHandler } from '@/utils/errorHandler';
import * as ArticleCategoryController from '../article-category.controller';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await ArticleCategoryController.getArticleCategoryById(req, { params });
  } catch (error) {
    return errorHandler(error, req);
  }
}

