import { errorHandler } from '@/utils/error-handler';
import * as ProjectResourceController from './project-resource.controller';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await ProjectResourceController.getPublicProjectResources(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
