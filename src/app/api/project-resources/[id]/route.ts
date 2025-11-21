import { errorHandler } from '@/utils/error-handler';
import * as ProjectResourceController from '../project-resource.controller';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await ProjectResourceController.getProjectResourceById(req, {
      params,
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
