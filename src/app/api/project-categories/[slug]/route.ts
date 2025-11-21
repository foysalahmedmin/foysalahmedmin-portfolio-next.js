import { errorHandler } from '@/utils/error-handler';
import * as ProjectCategoryController from '../project-category.controller';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    return await ProjectCategoryController.getProjectCategoryBySlug(req, {
      params,
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
