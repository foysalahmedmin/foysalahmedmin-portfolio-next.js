import { errorHandler } from '@/utils/error-handler';
import * as CaseStudyController from './case-study.controller';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await CaseStudyController.getPublicCaseStudies(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
