import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as ArticleCategoryController from '../article-category.controller';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await ArticleCategoryController.getArticleCategoryById(req, { params: resolvedParams });
  } catch (error) {
    return errorHandler(error, req);
  }
}

