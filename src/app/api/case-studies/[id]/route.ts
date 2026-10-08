import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as CaseStudyController from '../case-study.controller';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await CaseStudyController.getPublicCaseStudyById(req, {
      params: resolvedParams,
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
