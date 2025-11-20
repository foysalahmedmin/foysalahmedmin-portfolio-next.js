import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import AppError from '@/builder/AppError';
import httpStatus from 'http-status';

type TFile = {
  name: string;
  folder: string;
  size?: number;
  maxCount?: number;
  minCount?: number;
  allowedTypes?: string[];
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
            if (fileConfig.allowedTypes && !fileConfig.allowedTypes.includes(entry.type)) {
              throw new AppError(
                httpStatus.BAD_REQUEST,
                `Invalid file type for field "${fileConfig.name}". Allowed types: ${fileConfig.allowedTypes.join(', ')}`,
              );
            }

            // Validate file size
            if (fileConfig.size && entry.size > fileConfig.size) {
              throw new AppError(
                httpStatus.BAD_REQUEST,
                `File "${fileConfig.name}" exceeds maximum size of ${fileConfig.size} bytes`,
              );
            }

            fieldFiles.push(entry);
          }
        }

        // Check minCount
        if (fileConfig.minCount && fieldFiles.length < fileConfig.minCount) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `At least ${fileConfig.minCount} file(s) required for field "${fileConfig.name}"`,
          );
        }

        // Check maxCount
        if (fileConfig.maxCount && fieldFiles.length > fileConfig.maxCount) {
          throw new AppError(
            httpStatus.BAD_REQUEST,
            `Maximum ${fileConfig.maxCount} file(s) allowed for field "${fileConfig.name}"`,
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

