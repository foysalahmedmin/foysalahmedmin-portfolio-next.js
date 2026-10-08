import { errorHandler } from '@/utils/error-handler';
import * as VideoCategoryController from './video-category.controller';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await VideoCategoryController.getPublicVideoCategories(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
