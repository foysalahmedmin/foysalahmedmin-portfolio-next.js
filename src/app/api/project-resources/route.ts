import { errorHandler } from '@/utils/errorHandler';
import * as ProjectResourceController from './project-resource.controller';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await ProjectResourceController.getProjectResources(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
