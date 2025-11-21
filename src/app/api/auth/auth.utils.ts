import httpStatus from 'http-status';
import jwt, { JwtPayload, TokenExpiredError } from 'jsonwebtoken';
import AppError from '@/builder/app-error';
import { ENV } from '@/config';
import { TJwtPayload } from '@/types/jsonwebtoken.type';

export const createToken = (
  jwtPayload: Partial<TJwtPayload>,
  secret: string,
  expiresIn: string | number,
) => {
  return jwt.sign(jwtPayload, secret, { expiresIn });
};

export const verifyToken = (token: string, secret: string) => {
  try {
    return jwt.verify(token, secret) as JwtPayload;
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      throw new AppError(httpStatus.UNAUTHORIZED, 'Token expired');
    }
    throw new AppError(httpStatus.UNAUTHORIZED, 'Invalid token');
  }
};

