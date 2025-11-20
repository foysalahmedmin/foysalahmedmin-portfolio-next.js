import { auth } from '@/middleware/auth.middleware';
import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/errorHandler';
import * as ContactController from '../../contact.controller';
import * as ContactValidation from '../../contact.validation';
import { TRole } from '@/types/jsonwebtoken.type';
import { NextRequest } from 'next/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      (authedReq) => {
        authedReq.params = params;
        return ContactController.getContactById(authedReq, { params });
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ContactValidation.updateContactByIdSchema)(
          authedReq,
          (validatedReq) =>
            ContactController.updateContactById(validatedReq, { params }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    return await auth('super-admin', 'admin' as TRole)(
      req,
      async (authedReq) => {
        authedReq.params = params;
        return await validation(ContactValidation.contactByIdOperationValidationSchema)(
          authedReq,
          (validatedReq) =>
            ContactController.deleteContactById(validatedReq, { params }),
        );
      },
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

