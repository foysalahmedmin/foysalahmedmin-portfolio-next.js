import { auth } from '@/middleware/auth.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as UserController from '../user.controller';
import * as UserValidation from '../user.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';
import { validation } from '@/middleware/validation.middleware';

export async function GET(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      UserController.getUsers,
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
        return await validation(UserValidation.updateUsersValidationSchema)(
          authedReq,
          UserController.updateUsers,
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
        return await validation(UserValidation.usersOperationValidationSchema)(
          authedReq,
          UserController.deleteUsers,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

