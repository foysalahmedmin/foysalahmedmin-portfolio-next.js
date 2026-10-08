import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as CaseStudyCategoryController from '../case-study-category.controller';
import * as CaseStudyCategoryValidation from '../case-study-category.validation';
import type { TRole } from '@/types/jsonwebtoken.type';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      CaseStudyCategoryController.getCaseStudyCategories,
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
        return await validation(CaseStudyCategoryValidation.createCaseStudyCategorySchema)(
          authedReq,
          CaseStudyCategoryController.createCaseStudyCategory,
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
        return await validation(CaseStudyCategoryValidation.updateCaseStudyCategoriesSchema)(
          authedReq,
          CaseStudyCategoryController.updateCaseStudyCategories,
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
        return await validation(CaseStudyCategoryValidation.caseStudyCategoriesOperationValidationSchema)(
          authedReq,
          CaseStudyCategoryController.deleteCaseStudyCategories,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
