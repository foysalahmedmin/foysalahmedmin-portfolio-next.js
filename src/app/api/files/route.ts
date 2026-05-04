import { auth } from '@/middleware/auth.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as FileController from './file.controller';

export async function GET(req: NextRequest) {
  try {
    return await auth(
      'super-admin',
      'admin',
      'editor',
      'author',
      'contributor' as TRole,
    )(req, FileController.getSelfFiles);
  } catch (error) {
    return errorHandler(error, req);
  }
}
