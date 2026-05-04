import { auth } from '@/middleware/auth.middleware';
import { file } from '@/middleware/file.middleware';
import { validation } from '@/middleware/validation.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as FileController from '../file.controller';
import * as FileValidation from '../file.validation';

export async function GET(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin', 'editor' as TRole)(
      req,
      FileController.getFiles,
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    return await auth(
      'super-admin',
      'admin',
      'editor',
      'author',
      'contributor' as TRole,
    )(req, async (authedReq) => {
      return await file({
        name: 'file',
        folder: 'files',
        max_size: 50_000_000,
        max_count: 1,
      })(authedReq, async (fileReq) => {
        return await validation(FileValidation.createFileValidationSchema)(
          fileReq,
          FileController.createLocalFile,
        );
      });
    });
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin', 'editor' as TRole)(
      req,
      async (authedReq) => {
        return await validation(FileValidation.updateFilesValidationSchema)(
          authedReq,
          FileController.updateFiles,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin', 'editor' as TRole)(
      req,
      async (authedReq) => {
        return await validation(
          FileValidation.filesOperationValidationSchema,
        )(authedReq, FileController.deleteFiles);
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
