export type TFileProvider = 'local' | 'gcs' | 'cloudinary';

export type TFileMetadata = {
  width?: number;
  height?: number;
  duration?: number;
  [key: string]: unknown;
};

export type TFilePopulated = {
  _id: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
  provider: TFileProvider;
  metadata?: TFileMetadata;
};

export type TFileUploadResponse = {
  success: boolean;
  status: number;
  message?: string;
  data: TFilePopulated[];
};
