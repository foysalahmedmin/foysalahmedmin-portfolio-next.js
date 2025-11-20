import { Document, Model, Types } from 'mongoose';

export type TContact = {
  name: string;
  email: string;
  subject: string;
  message: string;
  is_deleted?: boolean;
  created_at?: Date;
  updated_at?: Date;
};

export interface TContactDocument extends TContact, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TContactDocument | null>;
}

export interface TContactModel extends Model<TContactDocument> {
  isContactExist(_id: string): Promise<TContactDocument | null>;
  isContactExistByEmail(email: string): Promise<TContactDocument | null>;
}

