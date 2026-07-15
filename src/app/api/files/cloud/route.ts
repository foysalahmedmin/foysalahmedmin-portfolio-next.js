import { auth } from '@/middleware/auth.middleware';
import { storage } from '@/middleware/storage.middleware';
import { validation } from '@/middleware/validation.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as FileController from '../file.controller';
import * as FileValidation from '../file.validation';
import { ALLOWED_FILE_MIME_TYPES } from '../file.constants';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    return await auth(
      'super-admin',
      'admin',
      'editor',
      'author',
      'contributor' as TRole,
    )(req, async (authedReq) => {
      return await storage({
        name: 'file',
        max_size: 50_000_000,
        min_count: 1,
        max_count: 10,
        allowed_types: [...ALLOWED_FILE_MIME_TYPES],
        make_public: true,
      })(authedReq, async (storageReq) => {
        return await validation(FileValidation.createFileValidationSchema)(
          storageReq,
          FileController.createCloudFiles,
        );
      });
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
