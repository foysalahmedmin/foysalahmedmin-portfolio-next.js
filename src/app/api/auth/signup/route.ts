import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as AuthController from '../auth.controller';
import * as AuthValidation from '../auth.validation';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    return await validation(AuthValidation.signupValidationSchema)(
      req,
      AuthController.signup,
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
