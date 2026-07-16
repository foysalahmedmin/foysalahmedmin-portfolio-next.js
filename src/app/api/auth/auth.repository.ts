import * as UserRepository from "../users/user.repository";
import { User } from "../users/user.model";
import type { TUser, TUserDocument } from "../users/user.type";

export const findByEmail = async (
  email: string
): Promise<TUserDocument | null> => {
  return await User.findOne({ email }).select("+password +password_changed_at");
};

export const findByIdWithSecrets = async (
  id: string
): Promise<TUserDocument | null> => {
  return await User.findById(id).select("+password +password_changed_at");
};

export const create = async (data: Partial<TUser>): Promise<TUserDocument> => {
  return await UserRepository.create(data);
};

export const updateById = async (
  id: string,
  payload: Partial<TUser>
): Promise<TUserDocument | null> => {
  return await User.findOneAndUpdate({ _id: id }, payload, {
    new: true,
    runValidators: true,
  });
};

export const updateEligiblePasswordById = async (
  id: string,
  payload: Pick<TUser, "password" | "password_changed_at">
): Promise<TUserDocument | null> => {
  return await User.findOneAndUpdate(
    { _id: id, status: { $ne: "blocked" } },
    payload,
    { new: true, runValidators: true }
  );
};
