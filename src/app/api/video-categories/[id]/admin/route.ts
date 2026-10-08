import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as VideoCategoryController from '../../video-category.controller';
import * as VideoCategoryValidation from '../../video-category.validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await auth('super-admin', 'admin' as TRole)(
      req,
      (authedReq) => {
        authedReq.params = resolvedParams;
        return VideoCategoryController.getVideoCategoryById(authedReq, {
          params: resolvedParams,
        });
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = resolvedParams;
        return await validation(VideoCategoryValidation.updateVideoCategoryByIdSchema)(
          authedReq,
          (validatedReq) =>
            VideoCategoryController.updateVideoCategoryById(validatedReq, {
              params: resolvedParams,
            }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = resolvedParams;
        return await validation(VideoCategoryValidation.videoCategoryByIdOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            VideoCategoryController.deleteVideoCategoryById(validatedReq, {
              params: resolvedParams,
            }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

