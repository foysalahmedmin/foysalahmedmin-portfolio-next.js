import { auth } from '@/middleware/auth.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as FileController from '../file.controller';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await auth(
      'super-admin',
      'admin',
      'editor',
      'author',
      'contributor' as TRole,
    )(req, (authedReq) => {
      authedReq.params = resolvedParams;
      return FileController.getFile(authedReq, { params: resolvedParams });
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
