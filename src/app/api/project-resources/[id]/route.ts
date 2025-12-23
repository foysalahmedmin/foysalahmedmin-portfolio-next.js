import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as ProjectResourceController from '../project-resource.controller';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await ProjectResourceController.getProjectResourceById(req, {
      params: resolvedParams,
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
