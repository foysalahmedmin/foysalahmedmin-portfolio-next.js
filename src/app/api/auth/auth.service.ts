import AppError from '@/builder/app-error';
import { ENV } from '@/config';
import connectDB from '@/lib/db';
import type { TJwtPayload } from '@/types/jsonwebtoken.type';
import bcrypt from 'bcrypt';
import httpStatus from 'http-status';
import type { JwtPayload } from 'jsonwebtoken';
import * as FileService from '../files/file.service';
import * as AuthRepository from './auth.repository';
import type { TChangePassword, TSignin, TSignup } from './auth.type';
import { createToken, verifyToken } from './auth.utils';

const MODEL = 'User' as const;

const buildJwtPayload = (user: {
  _id: { toString(): string };
  name: string;
  email: string;
  role?: string;
  is_verified?: boolean;
  image?: unknown;
}): TJwtPayload => ({
  _id: user._id.toString(),
  name: user.name,
  email: user.email,
  role: (user.role as TJwtPayload['role']) || 'user',
  is_verified: user.is_verified || false,
});

export const signin = async (payload: TSignin) => {
  await connectDB();

  const user = await AuthRepository.findByEmail(payload.email);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  if (user?.is_deleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'User is deleted!');
  }

  if (user?.status == 'blocked') {
    throw new AppError(httpStatus.FORBIDDEN, 'User is blocked!');
  }

  if (!(await bcrypt.compare(payload?.password, user?.password))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Password do not matched!');
  }

  const jwtPayload = buildJwtPayload(user);

  const accessToken = createToken(
    jwtPayload,
    ENV.jwt_access_secret,
    ENV.jwt_access_secret_expires_in,
  );

  const refreshToken = createToken(
    jwtPayload,
    ENV.jwt_refresh_secret,
    ENV.jwt_refresh_secret_expires_in,
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    info: jwtPayload,
  };
};

export const signup = async (payload: TSignup) => {
  await connectDB();

  const isExist = await AuthRepository.findByEmail(payload.email);
  if (isExist) {
    throw new AppError(httpStatus.CONFLICT, 'User already exists!');
  }

  if (payload.image) {
    await FileService.validateFileIds([payload.image]);
  }

  const user = await AuthRepository.create({
    ...payload,
    role: 'user',
  } as never);

  if (!user) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Failed to create user!',
    );
  }

  const entityId = user._id.toString();

  if (payload.image) {
    await FileService.attachToEntity({
      fileIds: payload.image,
      model: MODEL,
      entity: entityId,
      field: 'image',
    });
  }

  const jwtPayload = buildJwtPayload(user);

  const accessToken = createToken(
    jwtPayload,
    ENV.jwt_access_secret,
    ENV.jwt_access_secret_expires_in,
  );

  const refreshToken = createToken(
    jwtPayload,
    ENV.jwt_refresh_secret,
    ENV.jwt_refresh_secret_expires_in,
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    info: jwtPayload,
  };
};

export const refreshToken = async (token: string) => {
  await connectDB();

  const { email, iat } = verifyToken(token, ENV.jwt_refresh_secret);

  if (!email || typeof iat !== 'number') {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      'You do not have the necessary permissions to access this resource.',
    );
  }

  const user = await AuthRepository.findByEmail(email);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  if (user?.is_deleted) {
    throw new AppError(httpStatus.FORBIDDEN, 'User is deleted!');
  }

  if (user?.status == 'blocked') {
    throw new AppError(httpStatus.FORBIDDEN, 'User is blocked!');
  }

  if (user?.password_changed_at) {
    const passwordChangedAt = new Date(user.password_changed_at).getTime();
    const tokenIssuedAt = iat * 1000;

    if (passwordChangedAt > tokenIssuedAt) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        'Password recently changed. Please signin again.',
      );
    }
  }

  const jwtPayload = buildJwtPayload(user);

  const accessToken = createToken(
    jwtPayload,
    ENV.jwt_access_secret,
    ENV.jwt_access_secret_expires_in,
  );

  return {
    access_token: accessToken,
    info: jwtPayload,
  };
};

export const changePassword = async (
  user: JwtPayload,
  payload: TChangePassword,
) => {
  await connectDB();

  const userData = await AuthRepository.findByIdWithSecrets(user._id);
  if (!userData) {
    throw new AppError(httpStatus.NOT_FOUND, 'User not found!');
  }

  if (!(await bcrypt.compare(payload?.current_password, userData?.password))) {
    throw new AppError(httpStatus.FORBIDDEN, 'Password do not matched!');
  }

  const hashedNewPassword = await bcrypt.hash(
    payload.new_password,
    Number(ENV.bcrypt_salt_rounds),
  );

  return await AuthRepository.updateById(user._id, {
    password: hashedNewPassword,
    password_changed_at: new Date(),
  });
};
