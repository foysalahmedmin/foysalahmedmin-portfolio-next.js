import AppError from '@/builder/app-error';
import { ENV } from '@/config';
import httpStatus from 'http-status';
import type { NextRequest, NextResponse } from 'next/server';
import path from 'path';

export type TStorageResult = {
  field_name: string;
  original_name: string;
  filename: string;
  bucket: string;
  public_url?: string;
  size: number;
  mimetype: string;
  uploaded_at: Date;
};

export type TStorageFile = {
  name: string;
  max_size?: number;
  min_size?: number;
  max_count?: number;
  min_count?: number;
  allowed_types?: string[];
  bucket?: string;
  make_public?: boolean;
};

const lazyGcsClient = async () => {
  const { Storage } = await import('@google-cloud/storage');

  return new Storage({
    ...(ENV.gcp_credentials_path && {
      keyFilename: ENV.gcp_credentials_path,
    }),
    ...(ENV.gcp_project_id && {
      projectId: ENV.gcp_project_id,
    }),
  });
};

export const storage = (...files: TStorageFile[]) => {
  return async (
    req: NextRequest,
    handler: (
      req: NextRequest & { storages?: TStorageResult[] },
    ) => Promise<NextResponse>,
  ): Promise<NextResponse> => {
    try {
      const formData = await req.formData();
      const collected: Record<string, File[]> = {};

      for (const config of files) {
        const fieldFiles: File[] = [];
        const entries = formData.getAll(config.name);

        for (const entry of entries) {
          if (!(entry instanceof File)) continue;

          if (
            config.allowed_types &&
            !config.allowed_types.includes(entry.type)
          ) {
            throw new AppError(
              httpStatus.BAD_REQUEST,
              `Invalid file type for field "${config.name}". Allowed types: ${config.allowed_types.join(', ')}`,
            );
          }

          if (config.max_size && entry.size > config.max_size) {
            throw new AppError(
              httpStatus.BAD_REQUEST,
              `File "${config.name}" exceeds maximum size of ${config.max_size} bytes`,
            );
          }

          if (config.min_size && entry.size < config.min_size) {
            throw new AppError(
              httpStatus.BAD_REQUEST,
              `File "${config.name}" is below minimum size of ${config.min_size} bytes`,
            );
          }

          fieldFiles.push(entry);
        }

        if (config.min_count && fieldFiles.length < config.min_count) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `At least ${config.min_count} file(s) required for field "${config.name}"`,
          );
        }

        if (config.max_count && fieldFiles.length > config.max_count) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Maximum ${config.max_count} file(s) allowed for field "${config.name}"`,
          );
        }

        if (fieldFiles.length > 0) {
          collected[config.name] = fieldFiles;
        }
      }

      if (!ENV.gcp_bucket_name) {
        throw new AppError(
          httpStatus.INTERNAL_SERVER_ERROR,
          'GCP bucket name is not configured. Set GCP_BUCKET_NAME in env.',
        );
      }

      const client = await lazyGcsClient();
      const defaultBucket = ENV.gcp_bucket_name;

      const results: TStorageResult[] = [];

      for (const config of files) {
        const fieldFiles = collected[config.name];
        if (!fieldFiles?.length) continue;

        const bucketName = config.bucket || defaultBucket;
        const bucket = client.bucket(bucketName);
        const makePublic = config.make_public ?? false;

        for (const f of fieldFiles) {
          const ext = path.extname(f.name);
          const baseName = path.basename(f.name, ext);
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const filename = `${baseName}-${uniqueSuffix}${ext}`;

          const bucketFile = bucket.file(filename);
          const buffer = Buffer.from(await f.arrayBuffer());

          await bucketFile.save(buffer, {
            metadata: {
              contentType: f.type,
              metadata: {
                originalName: f.name,
                fieldName: config.name,
              },
            },
          });

          if (makePublic) {
            try {
              await bucketFile.makePublic();
            } catch (error: unknown) {
              const message = (error as Error)?.message || '';
              if (!message.includes('uniform bucket-level access')) {
                throw error;
              }
            }
          }

          const publicUrl = makePublic
            ? `https://storage.googleapis.com/${bucketName}/${filename}`
            : undefined;

          results.push({
            field_name: config.name,
            original_name: f.name,
            filename,
            bucket: bucketName,
            public_url: publicUrl,
            size: f.size,
            mimetype: f.type,
            uploaded_at: new Date(),
          });
        }
      }

      const modifiedReq = Object.assign(req, {
        storages: results,
      }) as NextRequest & { storages?: TStorageResult[] };

      return await handler(modifiedReq);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        httpStatus.BAD_REQUEST,
        error instanceof Error ? error.message : 'Cloud storage upload error',
      );
    }
  };
};
