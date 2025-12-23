import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as ReviewController from '../../review.controller';
import * as ReviewValidation from '../../review.validation';
import type { TRole } from '@/types/jsonwebtoken.type';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ReviewValidation.reviewsOperationValidationSchema)(
          authedReq,
          ReviewController.restoreReviews,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

