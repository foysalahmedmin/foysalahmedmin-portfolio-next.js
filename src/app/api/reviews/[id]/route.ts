import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ReviewController from '../review.controller';
import * as ReviewValidation from '../review.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await ReviewController.getReviewById(req, { params });
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Users can update their own reviews
    return await auth('user' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ReviewValidation.updateReviewSchema)(
          authedReq,
          (validatedReq) =>
            ReviewController.updateReviewById(validatedReq, { params }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    // Users can delete their own reviews
    return await auth('user' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ReviewValidation.reviewByIdOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ReviewController.deleteReviewById(validatedReq, { params }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

