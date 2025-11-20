import { errorHandler } from '@/utils/errorHandler';
import * as ProjectController from './project.controller';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await ProjectController.getProjects(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
