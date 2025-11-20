import { errorHandler } from '@/utils/errorHandler';
import * as ProjectCategoryController from './project-category.controller';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await ProjectCategoryController.getProjectCategories(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
