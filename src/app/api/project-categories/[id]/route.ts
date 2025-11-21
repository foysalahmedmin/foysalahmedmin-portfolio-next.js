import { errorHandler } from '@/utils/error-handler';
import * as ProjectCategoryController from '../project-category.controller';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await ProjectCategoryController.getProjectCategoryById(req, { params });
  } catch (error) {
    return errorHandler(error, req);
  }
}

