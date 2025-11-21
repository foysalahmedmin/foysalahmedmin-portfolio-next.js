import { errorHandler } from '@/utils/error-handler';
import sendResponse from '@/utils/send-response';
import httpStatus from 'http-status';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const ACCESS_TOKEN_COOKIE = 'access_token';

export async function POST(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    
    // Delete both tokens
    cookieStore.delete(REFRESH_TOKEN_COOKIE);
    cookieStore.delete(ACCESS_TOKEN_COOKIE);

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
