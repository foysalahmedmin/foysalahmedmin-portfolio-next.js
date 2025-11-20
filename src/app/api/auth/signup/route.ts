import { file } from '@/middleware/file.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as AuthController from '../auth.controller';
import * as AuthValidation from '../auth.validation';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    return await file({
      name: 'image',
      folder: 'users',
      max_size: 5_000_000,
      max_count: 1,
      allowed_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
    })(
      req,
      async (fileReq) => {
        return await validation(AuthValidation.signupValidationSchema)(
          fileReq,
          AuthController.signup,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
