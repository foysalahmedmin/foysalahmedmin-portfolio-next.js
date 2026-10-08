import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as VideoController from '../video.controller';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await VideoController.getPublicVideoById(req, {
      params: resolvedParams,
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
