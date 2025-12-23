import type { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import AppError from '@/builder/app-error';
import httpStatus from 'http-status';

type TFile = {
  name: string;
  folder: string;
  max_size?: number;
  min_size?: number;
  max_count?: number;
  min_count?: number;
  allowed_types?: string[];
};

export const file = (...files: TFile[]) => {
  return async (
    req: NextRequest,
    handler: (req: NextRequest & { files?: Record<string, File[]> }) => Promise<NextResponse>,
  ): Promise<NextResponse> => {
    try {
      const formData = await req.formData();
      const uploadedFiles: Record<string, File[]> = {};

      // Process each configured file field
      for (const fileConfig of files) {
        const fieldFiles: File[] = [];
        const formDataEntries = formData.getAll(fileConfig.name);

        for (const entry of formDataEntries) {
          if (entry instanceof File) {
            // Validate file type
            if (fileConfig.allowed_types && !fileConfig.allowed_types.includes(entry.type)) {
              throw new AppError(
                httpStatus.BAD_REQUEST,
                `Invalid file type for field "${fileConfig.name}". Allowed types: ${fileConfig.allowed_types.join(', ')}`,
              );
            }

            // Validate file size - max_size
            if (fileConfig.max_size && entry.size > fileConfig.max_size) {
              throw new AppError(
                httpStatus.BAD_REQUEST,
                `File "${fileConfig.name}" exceeds maximum size of ${fileConfig.max_size} bytes`,
              );
            }

            // Validate file size - min_size
            if (fileConfig.min_size && entry.size < fileConfig.min_size) {
              throw new AppError(
                httpStatus.BAD_REQUEST,
                `File "${fileConfig.name}" is below minimum size of ${fileConfig.min_size} bytes`,
              );
            }

            fieldFiles.push(entry);
          }
        }

        // Check min_count
        if (fileConfig.min_count && fieldFiles.length < fileConfig.min_count) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `At least ${fileConfig.min_count} file(s) required for field "${fileConfig.name}"`,
          );
        }

        // Check max_count
        if (fileConfig.max_count && fieldFiles.length > fileConfig.max_count) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Maximum ${fileConfig.max_count} file(s) allowed for field "${fileConfig.name}"`,
          );
        }

        if (fieldFiles.length > 0) {
          uploadedFiles[fileConfig.name] = fieldFiles;
        }
      }

      // Save files to disk
      const savedFiles: Record<string, string[]> = {};
      for (const [fieldName, fileArray] of Object.entries(uploadedFiles)) {
        const fileConfig = files.find((f) => f.name === fieldName);
        if (!fileConfig) continue;

        const folder = fileConfig.folder.replace(/^\/+/, '');
        const dir = path.join(process.cwd(), 'public', 'uploads', folder);
        fs.mkdirSync(dir, { recursive: true });

        const savedPaths: string[] = [];
        for (const file of fileArray) {
          const ext = path.extname(file.name);
          const baseName = path.basename(file.name, ext);
          const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
          const filename = `${baseName}-${uniqueSuffix}${ext}`;
          const filePath = path.join(dir, filename);

          const bytes = await file.arrayBuffer();
          const buffer = Buffer.from(bytes);
          fs.writeFileSync(filePath, buffer);

          savedPaths.push(`/uploads/${folder}/${filename}`);
        }
        savedFiles[fieldName] = savedPaths;
      }

      // Attach saved file paths to request
      const modifiedReq = {
        ...req,
        files: uploadedFiles,
        savedFiles,
      } as NextRequest & {
        files?: Record<string, File[]>;
        savedFiles?: Record<string, string[]>;
      };

      return await handler(modifiedReq);
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(
        httpStatus.BAD_REQUEST,
        error instanceof Error ? error.message : 'File upload error',
      );
    }
  };
};
