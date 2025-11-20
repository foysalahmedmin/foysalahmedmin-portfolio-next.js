import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ProjectResourceController from '../project-resource.controller';
import * as ProjectResourceValidation from '../project-resource.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      ProjectResourceController.getProjectResources,
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
        return await validation(ProjectResourceValidation.createProjectResourceSchema)(
          authedReq,
          ProjectResourceController.createProjectResource,
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
        return await validation(ProjectResourceValidation.updateProjectResourcesSchema)(
          authedReq,
          ProjectResourceController.updateProjectResources,
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
        return await validation(ProjectResourceValidation.projectResourcesOperationValidationSchema)(
          authedReq,
          ProjectResourceController.deleteProjectResources,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
