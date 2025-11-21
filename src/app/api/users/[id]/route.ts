import { errorHandler } from '@/utils/error-handler';
import * as UserController from '../user.controller';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await UserController.getUser(req, { params });
  } catch (error) {
    return errorHandler(error, req);
  }
}