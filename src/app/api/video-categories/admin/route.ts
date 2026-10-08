import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as VideoCategoryController from '../video-category.controller';
import * as VideoCategoryValidation from '../video-category.validation';
import type { TRole } from '@/types/jsonwebtoken.type';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      VideoCategoryController.getVideoCategories,
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(VideoCategoryValidation.createVideoCategorySchema)(
          authedReq,
          VideoCategoryController.createVideoCategory,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(VideoCategoryValidation.updateVideoCategoriesSchema)(
          authedReq,
          VideoCategoryController.updateVideoCategories,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(VideoCategoryValidation.videoCategoriesOperationValidationSchema)(
          authedReq,
          VideoCategoryController.deleteVideoCategories,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
