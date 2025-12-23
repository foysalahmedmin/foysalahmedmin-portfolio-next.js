import { auth } from '@/middleware/auth.middleware';
import { file } from '@/middleware/file.middleware';
import { validation } from '@/middleware/validation.middleware';
import type { TRole } from '@/types/jsonwebtoken.type';
import { errorHandler } from '@/utils/error-handler';
import type { NextRequest } from 'next/server';
import * as ProjectController from '../../project.controller';
import * as ProjectValidation from '../../project.validation';

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
        return ProjectController.getProjectById(authedReq, { params: resolvedParams });
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
        return await file(
          {
            name: 'thumbnail',
            folder: 'projects',
            max_size: 5_000_000,
            max_count: 1,
            allowed_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
          },
          {
            name: 'images',
            folder: 'projects',
            max_size: 5_000_000,
            max_count: 10,
            allowed_types: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
          },
        )(
          authedReq,
          async (fileReq) => {
            return await validation(ProjectValidation.updateProjectByIdSchema)(
              fileReq,
              (validatedReq) =>
                ProjectController.updateProjectById(validatedReq, { params: resolvedParams }),
            );
          },
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
        return await validation(ProjectValidation.projectByIdOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ProjectController.deleteProjectById(validatedReq, { params: resolvedParams }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

