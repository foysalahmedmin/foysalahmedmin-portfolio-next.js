import { Document, Model, Types } from 'mongoose';
import { TRole } from '@/types/jsonwebtoken.type';

export type TStatus = 'in-progress' | 'blocked';

export type TUser = {
  image?: string;
  name: string;
  email: string;
  password: string;
  password_changed_at?: Date;
  role: TRole;
  status: TStatus;
  is_verified: boolean;
  is_deleted: boolean;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export interface TUserDocument extends TUser, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TUserDocument | null>;
}

export type TUserModel = Model<TUserDocument> & {
  isUserExist(_id: string): Promise<TUserDocument | null>;
  isUserExistByEmail(email: string): Promise<TUserDocument | null>;
};

