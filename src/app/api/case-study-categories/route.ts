import { errorHandler } from '@/utils/error-handler';
import * as CaseStudyCategoryController from './case-study-category.controller';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await CaseStudyCategoryController.getPublicCaseStudyCategories(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
