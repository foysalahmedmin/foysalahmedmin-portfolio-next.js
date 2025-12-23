import { errorHandler } from '@/utils/error-handler';
import * as ProjectController from './project.controller';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await ProjectController.getProjects(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
