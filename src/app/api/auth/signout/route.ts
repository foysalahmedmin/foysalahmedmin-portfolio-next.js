import { errorHandler } from '@/utils/errorHandler';
import sendResponse from '@/utils/sendResponse';
import httpStatus from 'http-status';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'refresh_token';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    cookieStore.delete(COOKIE_NAME);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Logged out successfully',
      data: null,
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}
