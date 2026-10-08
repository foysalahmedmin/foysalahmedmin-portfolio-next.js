import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as VideoController from '../../video.controller';
import * as VideoValidation from '../../video.validation';

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
        return VideoController.getVideoById(authedReq, { params: resolvedParams });
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
        return await validation(VideoValidation.updateVideoByIdSchema)(
          authedReq,
          (validatedReq) =>
            VideoController.updateVideoById(validatedReq, { params: resolvedParams }),
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
        return await validation(VideoValidation.videoByIdOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            VideoController.deleteVideoById(validatedReq, { params: resolvedParams }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
