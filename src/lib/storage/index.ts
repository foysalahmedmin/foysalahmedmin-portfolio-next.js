import AppError from '@/builder/app-error';
import { ENV } from '@/config';
import type { ConfigResponse, UploadApiResponse } from 'cloudinary';
import httpStatus from 'http-status';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import type {
  TCloudinaryResourceType,
  TCloudStorageProvider,
  TStorageAdapter,
  TStorageDeleteInput,
} from './storage.type';

const getRequiredEnv = (value: string | undefined, name: string): string => {
  const normalized = value?.trim();
  if (!normalized) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      `${name} is required for the selected storage provider`,
    );
  }
  return normalized;
};

export const getConfiguredStorageProvider = (): TCloudStorageProvider => {
  const provider = ENV.storage_provider || 'cloudinary';
  if (provider !== 'cloudinary' && provider !== 'gcp') {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'STORAGE_PROVIDER must be either "cloudinary" or "gcp"',
    );
  }
  return provider;
};

const normalizeFolder = (value?: string): string | undefined => {
  const folder = value?.trim().replace(/^\/+|\/+$/g, '');
  if (!folder) return undefined;
  if (folder.split('/').some((segment) => segment === '..')) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      'Storage folder cannot contain parent-directory segments',
    );
  }
  return folder;
};

const createUniqueFilename = (originalName: string): string => {
  const ext = path.extname(originalName);
  const rawBaseName = path.basename(originalName, ext);
  const baseName = rawBaseName
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
  const uniqueSuffix = `${Date.now()}-${randomUUID()}`;
  return `${baseName || 'file'}-${uniqueSuffix}${ext.toLowerCase()}`;
};

const createGcsClient = async () => {
  const { Storage } = await import('@google-cloud/storage');
  return new Storage({
    ...(ENV.gcp_credentials_path && {
      keyFilename: ENV.gcp_credentials_path,
    }),
    ...(ENV.gcp_project_id && { projectId: ENV.gcp_project_id }),
  });
};

let gcsClientPromise: ReturnType<typeof createGcsClient> | undefined;
const lazyGcsClient = () => {
  gcsClientPromise ??= createGcsClient();
  return gcsClientPromise;
};

const createCloudinaryClient = async () => {
  const cloudName = getRequiredEnv(
    ENV.cloudinary_cloud_name,
    'CLOUDINARY_CLOUD_NAME',
  );
  const apiKey = getRequiredEnv(ENV.cloudinary_api_key, 'CLOUDINARY_API_KEY');
  const apiSecret = getRequiredEnv(
    ENV.cloudinary_api_secret,
    'CLOUDINARY_API_SECRET',
  );
  const { v2: cloudinary } = await import('cloudinary');
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  return cloudinary;
};

let cloudinaryClientPromise:
  | ReturnType<typeof createCloudinaryClient>
  | undefined;
const lazyCloudinaryClient = () => {
  cloudinaryClientPromise ??= createCloudinaryClient();
  return cloudinaryClientPromise;
};

type TCloudinaryFolderMode = 'dynamic' | 'fixed';

const fetchCloudinaryFolderMode = async (): Promise<TCloudinaryFolderMode> => {
  const cloudinary = await lazyCloudinaryClient();
  const response: ConfigResponse = await cloudinary.api.config({
    settings: true,
  });
  const folderMode = response.settings?.folder_mode;

  if (folderMode !== 'dynamic' && folderMode !== 'fixed') {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      'Cloudinary did not return a valid folder mode',
    );
  }

  return folderMode;
};

let cloudinaryFolderModePromise:
  | ReturnType<typeof fetchCloudinaryFolderMode>
  | undefined;
const lazyCloudinaryFolderMode = () => {
  cloudinaryFolderModePromise ??= fetchCloudinaryFolderMode();
  return cloudinaryFolderModePromise;
};

const getCloudinaryFilename = (result: {
  public_id: string;
  resource_type: string;
  format?: string;
}): string => {
  const baseName = path.posix.basename(result.public_id);
  if (
    result.resource_type === 'raw' ||
    !result.format ||
    baseName.toLowerCase().endsWith(`.${result.format.toLowerCase()}`)
  ) {
    return baseName;
  }
  return `${baseName}.${result.format}`;
};

const createGcpPublicUrl = (bucket: string, filename: string): string =>
  `https://storage.googleapis.com/${bucket}/${encodeURIComponent(filename)}`;

const assertGcpObjectIsPublic = async (publicUrl: string): Promise<void> => {
  let response: Response;
  try {
    response = await fetch(publicUrl, { method: 'HEAD', cache: 'no-store' });
  } catch {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      'GCP object public access could not be verified',
    );
  }

  if (!response.ok) {
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      'GCP bucket uses uniform access but is not publicly readable. Grant allUsers the Storage Object Viewer role or disable public uploads.',
    );
  }
};

const gcpAdapter: TStorageAdapter = {
  provider: 'gcp',
  async upload(file, config) {
    const bucketName = getRequiredEnv(
      config.bucket || ENV.gcp_bucket_name,
      'GCP_BUCKET_NAME',
    );
    const client = await lazyGcsClient();
    const bucket = client.bucket(bucketName);
    const filename = createUniqueFilename(file.name);
    const bucketFile = bucket.file(filename);
    const publicUrl = createGcpPublicUrl(bucketName, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    let saved = false;

    try {
      await bucketFile.save(buffer, {
        resumable: file.size > 5_000_000,
        metadata: {
          contentType: file.type,
          metadata: { originalName: file.name, fieldName: config.name },
        },
      });
      saved = true;

      if (config.make_public ?? true) {
        try {
          await bucketFile.makePublic();
        } catch (error: unknown) {
          const message = ((error as Error)?.message || '').toLowerCase();
          if (!message.includes('uniform bucket-level access')) throw error;
          await assertGcpObjectIsPublic(publicUrl);
        }
      }

      return {
        provider: 'gcp',
        field_name: config.name,
        original_name: file.name,
        filename,
        storage_key: filename,
        bucket: bucketName,
        public_url: publicUrl,
        size: file.size,
        mimetype: file.type,
        uploaded_at: new Date(),
      };
    } catch (error) {
      if (saved) await bucketFile.delete().catch(() => undefined);
      throw error;
    }
  },
  async remove(input) {
    const bucketName = getRequiredEnv(
      input.bucket || ENV.gcp_bucket_name,
      'GCP_BUCKET_NAME',
    );
    const client = await lazyGcsClient();
    try {
      await client.bucket(bucketName).file(input.storage_key).delete();
    } catch (error: unknown) {
      if ((error as { code?: number }).code !== 404) throw error;
    }
  },
};

const cloudinaryAdapter: TStorageAdapter = {
  provider: 'cloudinary',
  async upload(file, config) {
    const cloudinary = await lazyCloudinaryClient();
    const folder = normalizeFolder(config.folder || ENV.cloudinary_folder);
    const folderMode = folder
      ? await lazyCloudinaryFolderMode()
      : undefined;
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await new Promise<UploadApiResponse>(
      (resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'auto',
            ...(folder &&
              folderMode === 'dynamic' && {
                asset_folder: folder,
                use_filename_as_display_name: true,
              }),
            ...(folder && folderMode === 'fixed' && { folder }),
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            filename_override: file.name,
          },
          (error, uploadResult) => {
            if (error) return reject(error);
            if (!uploadResult) {
              return reject(new Error('Empty Cloudinary upload response'));
            }
            resolve(uploadResult);
          },
        );
        stream.end(buffer);
      },
    );

    const resourceType = result.resource_type;
    if (!['image', 'video', 'raw'].includes(resourceType)) {
      await cloudinary.uploader
        .destroy(result.public_id, { resource_type: resourceType })
        .catch(() => undefined);
      throw new Error(`Unsupported Cloudinary resource type: ${resourceType}`);
    }

    const returnedFolder =
      typeof result.asset_folder === 'string'
        ? result.asset_folder
        : typeof result.folder === 'string'
          ? result.folder
          : undefined;
    if (folder && returnedFolder !== folder) {
      await cloudinary.uploader
        .destroy(result.public_id, {
          resource_type: resourceType,
          type: result.type || 'upload',
          invalidate: true,
        })
        .catch(() => undefined);
      throw new Error('Cloudinary uploaded the asset to an unexpected folder');
    }

    return {
      provider: 'cloudinary',
      field_name: config.name,
      original_name: file.name,
      filename: getCloudinaryFilename(result),
      storage_key: result.public_id,
      public_url: result.secure_url,
      size: result.bytes,
      mimetype: file.type,
      uploaded_at: new Date(result.created_at),
      folder: returnedFolder,
      public_id: result.public_id,
      asset_id:
        typeof result.asset_id === 'string' ? result.asset_id : undefined,
      cloud_name: ENV.cloudinary_cloud_name,
      resource_type: resourceType as TCloudinaryResourceType,
      delivery_type: result.type || 'upload',
      format: result.format,
      version: result.version,
      etag: result.etag,
      width: result.width,
      height: result.height,
      duration:
        typeof result.duration === 'number' ? result.duration : undefined,
    };
  },
  async remove(input) {
    const cloudinary = await lazyCloudinaryClient();
    const result = (await cloudinary.uploader.destroy(input.storage_key, {
      resource_type: input.resource_type || 'image',
      type: input.delivery_type || 'upload',
      invalidate: true,
    })) as { result?: string };

    if (result.result !== 'ok' && result.result !== 'not found') {
      throw new Error(
        `Cloudinary returned an unexpected delete result: ${result.result || 'unknown'}`,
      );
    }
  },
};

export const getStorageAdapter = (
  provider: TCloudStorageProvider = getConfiguredStorageProvider(),
): TStorageAdapter => (provider === 'gcp' ? gcpAdapter : cloudinaryAdapter);

export const deleteCloudStorageObject = async (
  input: TStorageDeleteInput,
): Promise<void> => {
  try {
    await getStorageAdapter(input.provider).remove(input);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(
      httpStatus.BAD_GATEWAY,
      `Failed to delete object from ${input.provider} storage`,
    );
  }
};

export type {
  TCloudinaryResourceType,
  TCloudStorageProvider,
  TStorageDeleteInput,
  TStorageFile,
  TStorageResult,
} from './storage.type';
