import AppError from '@/builder/app-error';
import type { TJwtPayload } from '@/types/jsonwebtoken.type';
import httpStatus from 'http-status';
import type { JwtPayload} from 'jsonwebtoken';
import jwt, { TokenExpiredError } from 'jsonwebtoken';

export const createToken = (
  jwtPayload: Partial<TJwtPayload>,
  secret: string,
  expiresIn: string | number,
) => {
  return jwt.sign(jwtPayload, secret, { expiresIn } as jwt.SignOptions);
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

