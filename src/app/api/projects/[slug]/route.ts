import { errorHandler } from '@/utils/errorHandler';
import * as ProjectController from '../project.controller';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  try {
    return await ProjectController.getProjectBySlug(req, { params });
  } catch (error) {
    return errorHandler(error, req);
  }
}
