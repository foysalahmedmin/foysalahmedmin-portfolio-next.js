import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ReviewController from '../../review.controller';
import * as ReviewValidation from '../../review.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

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

