import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as AuthController from '../auth.controller';
import * as AuthValidation from '../auth.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin', 'user' as TRole)(
      req,
      async (authedReq) => {
        return await validation(AuthValidation.changePasswordValidationSchema)(
          authedReq,
          AuthController.changePassword,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

