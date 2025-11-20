import { errorHandler } from '@/utils/errorHandler';
import * as ProjectController from '../project.controller';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await ProjectController.getProjectById(req, { params });
  } catch (error) {
    return errorHandler(error, req);
  }
}

