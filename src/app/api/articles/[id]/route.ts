import { errorHandler } from '@/utils/error-handler';
import * as ArticleController from '../article.controller';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await ArticleController.getArticleById(req, { params });
  } catch (error) {
    return errorHandler(error, req);
  }
}

