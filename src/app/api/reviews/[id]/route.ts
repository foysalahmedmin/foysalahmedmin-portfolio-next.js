import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as ReviewController from '../review.controller';
import * as ReviewValidation from '../review.validation';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const resolvedParams = await params;
    return await ReviewController.getPublicReviewById(req, {
      params: resolvedParams,
    });
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
    // Users can update their own reviews
    return await auth('user' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = resolvedParams;
        return await validation(ReviewValidation.updateReviewSchema)(
          authedReq,
          (validatedReq) =>
            ReviewController.updateReviewById(validatedReq, { params: resolvedParams }),
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
    // Users can delete their own reviews
    return await auth('user' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = resolvedParams;
        return await validation(ReviewValidation.reviewByIdOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ReviewController.deleteReviewById(validatedReq, { params: resolvedParams }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
