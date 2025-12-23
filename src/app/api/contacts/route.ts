import { validation } from '@/middleware/validation.middleware';
import { errorHandler } from '@/utils/error-handler';
import * as ContactController from './contact.controller';
import * as ContactValidation from './contact.validation';
import type { NextRequest } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    return await validation(ContactValidation.createContactSchema)(
      req,
      ContactController.createContact,
    );
  } catch (error) {
    return errorHandler(error, req);
  }
}

