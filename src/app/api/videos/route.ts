import { errorHandler } from '@/utils/error-handler';
import * as VideoController from './video.controller';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await VideoController.getPublicVideos(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
