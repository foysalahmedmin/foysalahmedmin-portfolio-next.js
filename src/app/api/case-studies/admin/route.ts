import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as CaseStudyController from '../case-study.controller';
import * as CaseStudyValidation from '../case-study.validation';
import type { TRole } from '@/types/jsonwebtoken.type';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      CaseStudyController.getCaseStudies,
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
        return await validation(CaseStudyValidation.createCaseStudySchema)(
          authedReq,
          CaseStudyController.createCaseStudy,
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
        return await validation(CaseStudyValidation.updateCaseStudiesSchema)(
          authedReq,
          CaseStudyController.updateCaseStudies,
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
        return await validation(CaseStudyValidation.caseStudiesOperationValidationSchema)(
          authedReq,
          CaseStudyController.deleteCaseStudies,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
