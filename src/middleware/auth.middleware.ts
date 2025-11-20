import { ENV } from '@/config';
import connectDB from '@/lib/db';
import User from '@/app/api/users/user.model';
import AppError from '@/builder/AppError';
import httpStatus from 'http-status';
import jwt, { JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import { NextRequest, NextResponse } from 'next/server';
import { TRole, TJwtPayload } from '@/types/jsonwebtoken.type';

export type AuthUser = JwtPayload & TJwtPayload;

export interface AuthRequest extends NextRequest {
  user?: AuthUser;
  params?: Record<string, string>;
}

const getUser = async (_id: string) => {
  await connectDB();
  const user = await User.findById(_id)
    .select('+password_changed_at +is_deleted')
    .lean();

  return user;
};

export const auth = (...roles: (TRole | 'guest')[]) => {
  return async (
    req: Request,
    handler: (req: AuthRequest) => Promise<NextResponse>,
  ): Promise<NextResponse> => {
    const authReq = req as AuthRequest;
    const authorization = authReq.headers.get('authorization');
    const token = authorization?.split(' ')?.[1];

    if (roles.includes('guest') && !token) {
      return await handler(authReq);
    }

    if (!token) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'No token provided.');
    }

    let decoded: JwtPayload;
    try {
      decoded = jwt.verify(
        token,
        ENV.jwt_access_secret,
      ) as JwtPayload;
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new AppError(httpStatus.UNAUTHORIZED, 'Token expired');
      }
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token');
    }

    const { _id, role = 'user', iat } = decoded as TJwtPayload & { iat?: number };

    if (!_id || !role || typeof iat !== 'number') {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token.');
    }

    const user = await getUser(_id);

    if (!user) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'User not found');
    }

    if (user.is_deleted) {
      throw new AppError(httpStatus.FORBIDDEN, 'User is deleted');
    }

    if (user?.status === 'blocked') {
      throw new AppError(httpStatus.FORBIDDEN, 'User is blocked');
    }

    if (user?.password_changed_at) {
      const passwordChangedAt = new Date(user.password_changed_at).getTime();
      const tokenIssuedAt = iat * 1000; // convert seconds → ms

      if (passwordChangedAt > tokenIssuedAt) {
        throw new AppError(
          httpStatus.FORBIDDEN,
          'Password recently changed. Please login again.',
        );
      }
    }

    if (!roles.includes(role as TRole) || !roles.includes(user?.role as TRole)) {
      throw new AppError(httpStatus.FORBIDDEN, 'Access denied');
    }

    authReq.user = {
      ...decoded,
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      image: user.image,
      role: user.role as TRole,
      is_verified: user.is_verified,
    } as AuthUser;

    return await handler(authReq);
  };
};

// Legacy wrapper for backward compatibility
export async function withAuth(
  req: AuthRequest,
  handler: (req: AuthRequest) => Promise<NextResponse>,
) {
  return auth('user', 'admin', 'super-admin', 'editor', 'author', 'contributor', 'subscriber')(req, handler);
}

