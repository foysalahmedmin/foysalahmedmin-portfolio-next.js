import { auth } from '@/middleware/auth.middleware';
import { file } from '@/middleware/file.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as ProjectController from '../project.controller';
import * as ProjectValidation from '../project.validation';
import type { TRole } from '@/types/jsonwebtoken.type';
import type { NextRequest } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      ProjectController.getProjects,
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
        return await file(
          {
            name: 'thumbnail',
            folder: 'projects',
            max_size: 5_000_000, // 5MB
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
            return await validation(ProjectValidation.createProjectSchema)(
              fileReq,
              ProjectController.createProject,
            );
          },
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
        return await validation(ProjectValidation.updateProjectsSchema)(
          authedReq,
          ProjectController.updateProjects,
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
        return await validation(ProjectValidation.projectsOperationValidationSchema)(
          authedReq,
          ProjectController.deleteProjects,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}
