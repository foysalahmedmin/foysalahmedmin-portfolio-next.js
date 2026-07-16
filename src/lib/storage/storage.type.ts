import type { TFileAccess, TFilePurpose } from "@/app/api/files/file.type";

export type TCloudStorageProvider = "cloudinary" | "gcp";
export type TCloudinaryResourceType = "image" | "video" | "raw";

export type TStorageResult = {
  provider: TCloudStorageProvider;
  field_name: string;
  original_name: string;
  filename: string;
  storage_key: string;
  public_url?: string;
  size: number;
  mimetype: string;
  uploaded_at: Date;
  bucket?: string;
  folder?: string;
  public_id?: string;
  asset_id?: string;
  cloud_name?: string;
  resource_type?: TCloudinaryResourceType;
  delivery_type?: string;
  format?: string;
  version?: number;
  etag?: string;
  width?: number;
  height?: number;
  duration?: number;
};

export type TStorageFile = {
  name: string;
  max_size?: number;
  min_size?: number;
  max_count?: number;
  min_count?: number;
  allowed_types?: string[];
  bucket?: string;
  folder?: string;
  make_public?: boolean;
  purpose?: TFilePurpose;
  purpose_field?: string;
};

export type TStorageUploadInput = {
  buffer: Buffer;
  original_name: string;
  filename: string;
  mimetype: string;
  checksum: string;
  immutable_key: string;
  access: TFileAccess;
};

export type TStorageDeliveryInput = TStorageDeleteInput & {
  access: TFileAccess;
  public_url?: string;
  filename: string;
  expires_in_seconds: number;
  disposition: "inline" | "attachment";
  cloud_name?: string;
};

export type TStoredObject = TStorageDeleteInput & {
  created_at: Date;
};

export type TStorageListInput = {
  bucket?: string;
  prefix: string;
  older_than: Date;
  limit: number;
};

export type TStorageDeleteInput = Pick<
  TStorageResult,
  "provider" | "storage_key" | "bucket" | "resource_type" | "delivery_type"
>;

export type TStorageAdapter = {
  provider: TCloudStorageProvider;
  upload(
    input: TStorageUploadInput,
    config: Pick<TStorageFile, "name" | "bucket" | "folder">
  ): Promise<TStorageResult>;
  remove(input: TStorageDeleteInput): Promise<void>;
  getDeliveryUrl(input: TStorageDeliveryInput): Promise<string>;
  listManagedObjects(input: TStorageListInput): Promise<TStoredObject[]>;
};
