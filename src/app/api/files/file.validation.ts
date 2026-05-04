import { z } from 'zod';

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: 'Invalid ID format',
});

const statusSchema = z.enum(['active', 'inactive', 'archived']);

export const createFileValidationSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    description: z.string().max(500).optional(),
    caption: z.string().max(500).optional(),
    status: statusSchema.optional(),
  }),
});

export const updateFileValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    category: z.string().min(1).optional(),
    description: z.string().max(500).optional(),
    caption: z.string().max(500).optional(),
    status: statusSchema.optional(),
  }),
});

export const updateFilesValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).nonempty('At least one file ID is required'),
    status: statusSchema.optional(),
  }),
});

export const fileOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const filesOperationValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).nonempty('At least one file ID is required'),
  }),
});
