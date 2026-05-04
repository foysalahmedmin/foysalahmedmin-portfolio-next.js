import type { Document, Model, Types } from 'mongoose';

export type TFileProvider = 'local' | 'gcs';
export type TFileStatus = 'active' | 'inactive' | 'archived';
export type TFileType = 'image' | 'video' | 'audio' | 'document' | 'other';

export type TFileMetadata = {
  path?: string;
  bucket?: string;
  extension?: string;
  file_type?: TFileType;
};

export type TFile = {
  _id?: Types.ObjectId;
  filename: string;
  originalname: string;
  name: string;
  url: string;
  mimetype: string;
  size: number;
  author: Types.ObjectId;
  provider: TFileProvider;
  category?: string;
  description?: string;
  caption?: string;
  status: TFileStatus;
  is_deleted?: boolean;
  metadata?: TFileMetadata;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export type TFileInput = {
  name?: string;
  category?: string;
  description?: string;
  caption?: string;
  status?: TFileStatus;
};

export interface TFileDocument extends TFile, Document {
  _id: Types.ObjectId;
  softDelete(): Promise<TFileDocument | null>;
}

export type TFileModel = Model<TFileDocument> & {
  isFileExist(_id: string): Promise<TFileDocument | null>;
};
