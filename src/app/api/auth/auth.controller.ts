import { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catchAsync';
import sendResponse from '@/utils/sendResponse';
import httpStatus from 'http-status';
import { cookies } from 'next/headers';
import * as AuthService from './auth.service';

const COOKIE_NAME = 'refresh_token';
const COOKIE_MAX_AGE = 1000 * 60 * 60 * 24 * 365;

export const signin = catchAsync(async (req: Request & { parsedBody?: any }) => {
  const body = req.parsedBody || (await req.json());
  const { refresh_token, access_token, info } = await AuthService.signin(body);

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, refresh_token, {
    maxAge: COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'User is signed in successfully!',
    data: {
      token: access_token,
      info: info,
    },
  });
});

export const signup = catchAsync(
  async (req: Request & { parsedBody?: any; savedFiles?: Record<string, string[]> }) => {
    const body = req.parsedBody || (await req.json());
    const savedFiles = req.savedFiles as Record<string, string[]>;
    const image = savedFiles?.image?.[0] || '';

    const payload = {
      ...body,
      role: 'user',
      image,
    };

    const { refresh_token, access_token, info } = await AuthService.signup(
      payload,
    );

    const cookieStore = await cookies();
    cookieStore.set(COOKIE_NAME, refresh_token, {
      maxAge: COOKIE_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
    });

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'User is signed up successfully!',
      data: {
        token: access_token,
        info: info,
      },
    });
  },
);

export const refreshToken = catchAsync(async (req: Request) => {
  const cookieStore = await cookies();
  const refresh_token = cookieStore.get(COOKIE_NAME)?.value || '';

  if (!refresh_token) {
    throw new Error('Refresh token not found');
  }

  const { access_token, info } = await AuthService.refreshToken(refresh_token);

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Access token is retrieved successfully!',
    data: {
      token: access_token,
      info: info,
    },
  });
});

export const changePassword = catchAsync(
  async (req: AuthRequest & { parsedBody?: any }) => {
    const body = req.parsedBody || (await req.json());
    const result = await AuthService.changePassword(req.user!, body);

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'Password is changed successfully!',
      data: result,
    });
  },
);

