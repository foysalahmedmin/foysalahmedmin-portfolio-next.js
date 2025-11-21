import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ReviewController from './review.controller';
import * as ReviewValidation from './review.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await ReviewController.getReviews(req);
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Normal users can create reviews
    return await auth('user' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ReviewValidation.createReviewSchema)(
          authedReq,
          ReviewController.createReview,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

