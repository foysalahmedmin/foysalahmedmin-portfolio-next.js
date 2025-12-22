import AppError from "@/builder/app-error";
import { ENV } from "@/config";
import { TJwtPayload } from "@/types/jsonwebtoken.type";
import bcrypt from "bcrypt";
import httpStatus from "http-status";
import { JwtPayload } from "jsonwebtoken";
import { User } from "../users/user.model";
import { TChangePassword, TSignin, TSignup } from "./auth.type";
import { createToken, verifyToken } from "./auth.utils";

export const signin = async (payload: TSignin) => {
  const user = await User.isUserExistByEmail(payload.email);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  if (user?.is_deleted) {
    throw new AppError(httpStatus.FORBIDDEN, "User is deleted!");
  }

  if (user?.status == "blocked") {
    throw new AppError(httpStatus.FORBIDDEN, "User is blocked!");
  }

  if (!(await bcrypt.compare(payload?.password, user?.password))) {
    throw new AppError(httpStatus.FORBIDDEN, "Password do not matched!");
  }

  const jwtPayload: TJwtPayload = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role || "user",
    is_verified: user?.is_verified || false,
    ...(user.image && { image: user.image }),
  };

  const accessToken = createToken(
    jwtPayload,
    ENV.jwt_access_secret,
    ENV.jwt_access_secret_expires_in
  );

  const refreshToken = createToken(
    jwtPayload,
    ENV.jwt_refresh_secret,
    ENV.jwt_refresh_secret_expires_in
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    info: jwtPayload,
  };
};

export const signup = async (payload: TSignup) => {
  const isExist = await User.isUserExistByEmail(payload.email);
  if (isExist) {
    throw new AppError(httpStatus.CONFLICT, "User already exists!");
  }

  const user = await User.create({
    ...payload,
    role: "user",
  });

  if (!user) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Failed to create user!"
    );
  }

  const jwtPayload: TJwtPayload = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role || "user",
    is_verified: user?.is_verified || false,
    ...(user.image && { image: user.image }),
  };

  const accessToken = createToken(
    jwtPayload,
    ENV.jwt_access_secret,
    ENV.jwt_access_secret_expires_in
  );

  const refreshToken = createToken(
    jwtPayload,
    ENV.jwt_refresh_secret,
    ENV.jwt_refresh_secret_expires_in
  );

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    info: jwtPayload,
  };
};

export const refreshToken = async (token: string) => {
  const { email, iat } = verifyToken(token, ENV.jwt_refresh_secret);

  if (!email || typeof iat !== "number") {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "You do not have the necessary permissions to access this resource."
    );
  }

  const user = await User.isUserExistByEmail(email);

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  if (user?.is_deleted) {
    throw new AppError(httpStatus.FORBIDDEN, "User is deleted!");
  }

  if (user?.status == "blocked") {
    throw new AppError(httpStatus.FORBIDDEN, "User is blocked!");
  }

  if (user?.password_changed_at) {
    const passwordChangedAt = new Date(user.password_changed_at).getTime();
    const tokenIssuedAt = iat * 1000; // convert seconds → ms

    if (passwordChangedAt > tokenIssuedAt) {
      throw new AppError(
        httpStatus.FORBIDDEN,
        "Password recently changed. Please signin again."
      );
    }
  }

  const jwtPayload: TJwtPayload = {
    _id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role || "user",
    is_verified: user?.is_verified || false,
    ...(user.image && { image: user.image }),
  };

  const accessToken = createToken(
    jwtPayload,
    ENV.jwt_access_secret,
    ENV.jwt_access_secret_expires_in
  );

  return {
    access_token: accessToken,
    info: jwtPayload,
  };
};

export const changePassword = async (
  user: JwtPayload,
  payload: TChangePassword
) => {
  const userData = await User.isUserExist(user._id);
  if (!userData) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found!");
  }

  if (!(await bcrypt.compare(payload?.current_password, userData?.password))) {
    throw new AppError(httpStatus.FORBIDDEN, "Password do not matched!");
  }

  const hashedNewPassword = await bcrypt.hash(
    payload.new_password,
    Number(ENV.bcrypt_salt_rounds)
  );

  const result = await User.findOneAndUpdate(
    {
      _id: user._id,
    },
    {
      password: hashedNewPassword,
      password_changed_at: new Date(),
    },
    {
      new: true,
      runValidators: true,
    }
  );

  return result;
};
