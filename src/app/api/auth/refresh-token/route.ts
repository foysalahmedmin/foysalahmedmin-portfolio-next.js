import { errorHandler } from '@/utils/error-handler';
import * as AuthController from '../auth.controller';
import { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    return await AuthController.refreshToken(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}
