import { errorHandler } from '@/utils/errorHandler';
import * as ArticleController from '../article.controller';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    return await ArticleController.getArticleBySlug(req, { params });
  } catch (error) {
    return errorHandler(error, req);
  }
}
