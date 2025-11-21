import { z } from 'zod';

const slugSchema = z.string().min(1).max(100);

export const createArticleCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    slug: z.string().min(1).max(50),
    sequence: z.number().min(1).max(100),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    parent: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive']).default('active'),
    tags: z.array(z.string()).default([]),
    layout: z.string().default('default'),
  }),
});

export const updateArticleCategorySchema = z.object({
  params: z.object({
    slug: slugSchema,
  }),
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    slug: z.string().min(1).max(50).optional(),
    sequence: z.number().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    parent: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive']).optional(),
    tags: z.array(z.string()).optional(),
    layout: z.string().optional(),
  }),
});

export const updateArticleCategoriesSchema = z.object({
  body: z.object({
    slugs: z
      .array(slugSchema, {
        required_error: 'At least one article category slug is required',
        invalid_type_error: 'Article category slugs must be an array of strings',
      })
      .nonempty('At least one article category slug is required'),
    status: z.enum(['active', 'inactive']).optional(),
    parent: z.string().optional().nullable(),
  }),
});

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: 'Invalid ID format',
});

export const updateArticleCategoryByIdSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    slug: z.string().min(1).max(50).optional(),
    sequence: z.number().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    parent: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive']).optional(),
    tags: z.array(z.string()).optional(),
    layout: z.string().optional(),
  }),
});

export const articleCategoryOperationValidationSchema = z.object({
  params: z.object({
    slug: slugSchema,
  }),
});

export const articleCategoryByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const articleCategoriesOperationValidationSchema = z.object({
  body: z.object({
    slugs: z.array(slugSchema).nonempty('At least one article category slug is required'),
  }),
});
