import { errorHandler } from '@/utils/error-handler';
import * as ProjectCategoryController from './project-category.controller';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await ProjectCategoryController.getPublicProjectCategories(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
