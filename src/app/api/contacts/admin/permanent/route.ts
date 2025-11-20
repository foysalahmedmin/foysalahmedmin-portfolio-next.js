import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ContactController from '../../contact.controller';
import * as ContactValidation from '../../contact.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function DELETE(req: NextRequest) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        return await validation(ContactValidation.contactsOperationValidationSchema)(
          authedReq,
          ContactController.deleteContactsPermanent,
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

