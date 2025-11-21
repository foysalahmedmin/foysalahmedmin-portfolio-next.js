import { errorHandler } from '@/utils/error-handler';
import * as ArticleController from './article.controller';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await ArticleController.getArticles(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
