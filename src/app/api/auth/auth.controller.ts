import type { AuthRequest } from '@/middleware/auth.middleware';
import catchAsync from '@/utils/catch-async';
import sendResponse from '@/utils/send-response';
import httpStatus from 'http-status';
import { cookies } from 'next/headers';
import * as AuthService from './auth.service';

const REFRESH_TOKEN_COOKIE = 'refresh_token';
const ACCESS_TOKEN_COOKIE = 'access_token';
const REFRESH_TOKEN_MAX_AGE = 365 * 24 * 60 * 60; // 1 year
const ACCESS_TOKEN_MAX_AGE = 15 * 60; // 15 minutes

export const signin = catchAsync(async (req: Request & { parsedBody?: any }) => {
  const body = req.parsedBody || (await req.json());
  const { refresh_token, access_token, info } = await AuthService.signin(body);

  const cookieStore = await cookies();
  
  // Refresh Token (httpOnly cookie)
  cookieStore.set(REFRESH_TOKEN_COOKIE, refresh_token, {
    maxAge: REFRESH_TOKEN_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  // Access Token (httpOnly cookie) - NEW
  cookieStore.set(ACCESS_TOKEN_COOKIE, access_token, {
    maxAge: ACCESS_TOKEN_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'User is signed in successfully!',
    data: {
      token: access_token, // Keep for backward compatibility (localStorage)
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
    
    // Refresh Token (httpOnly cookie)
    cookieStore.set(REFRESH_TOKEN_COOKIE, refresh_token, {
      maxAge: REFRESH_TOKEN_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    // Access Token (httpOnly cookie) - NEW
    cookieStore.set(ACCESS_TOKEN_COOKIE, access_token, {
      maxAge: ACCESS_TOKEN_MAX_AGE,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
    });

    return sendResponse({
      status: httpStatus.OK,
      success: true,
      message: 'User is signed up successfully!',
      data: {
        token: access_token, // Keep for backward compatibility (localStorage)
        info: info,
      },
    });
  },
);

export const refreshToken = catchAsync(async (req: Request) => {
  const cookieStore = await cookies();
  const refresh_token = cookieStore.get(REFRESH_TOKEN_COOKIE)?.value || '';

  if (!refresh_token) {
    throw new Error('Refresh token not found');
  }

  const { access_token, info } = await AuthService.refreshToken(refresh_token);

  // Update access_token cookie - NEW
  cookieStore.set(ACCESS_TOKEN_COOKIE, access_token, {
    maxAge: ACCESS_TOKEN_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
  });

  return sendResponse({
    status: httpStatus.OK,
    success: true,
    message: 'Access token is retrieved successfully!',
    data: {
      token: access_token, // Keep for backward compatibility (localStorage)
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

