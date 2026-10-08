import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as CaseStudyCategoryController from '../case-study-category.controller';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await CaseStudyCategoryController.getPublicCaseStudyCategoryById(req, {
      params: resolvedParams,
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
