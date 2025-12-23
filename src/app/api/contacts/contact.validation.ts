import { z } from 'zod';

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: 'Invalid ID format',
});

export const createContactSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters'),
    email: z.string().email('Invalid email format'),
    subject: z
      .string()
      .min(2, 'Subject must be at least 2 characters')
      .max(200, 'Subject cannot exceed 200 characters'),
    message: z
      .string()
      .min(10, 'Message must be at least 10 characters')
      .max(2000, 'Message cannot exceed 2000 characters'),
  }),
});

export const updateContactByIdSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters')
      .optional(),
    email: z.string().email('Invalid email format').optional(),
    subject: z
      .string()
      .min(2, 'Subject must be at least 2 characters')
      .max(200, 'Subject cannot exceed 200 characters')
      .optional(),
    message: z
      .string()
      .min(10, 'Message must be at least 10 characters')
      .max(2000, 'Message cannot exceed 2000 characters')
      .optional(),
  }),
});

export const updateContactsSchema = z.object({
  body: z.object({
    ids: z
      .array(idSchema)
      .min(1, 'At least one contact ID is required'),
  }),
});

export const contactByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const contactsOperationValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).min(1, 'At least one contact ID is required'),
  }),
});

