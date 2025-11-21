import { z } from 'zod';

export const createArticleSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    content: z.string().min(1),
    category: z.string().min(1),
    description: z.string().max(300).optional(),
    thumbnail: z.string().optional(),
    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    collaborators: z.array(z.string()).optional(),
    status: z.enum(['draft', 'pending', 'published', 'archived']).default('draft'),
    is_featured: z.boolean().default(false),
    is_premium: z.boolean().default(false),
    published_at: z.string().datetime().optional(),
    expired_at: z.string().datetime().optional(),
    layout: z.string().default('default'),
  }),
});

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: 'Invalid ID format',
});

export const updateArticlesSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).min(1, 'At least one article ID is required'),
    status: z.enum(['draft', 'pending', 'published', 'archived']).optional(),
    is_featured: z.boolean().optional(),
    category: z.string().min(1).optional(),
  }),
});

export const updateArticleByIdSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    description: z.string().max(300).optional(),
    content: z.string().min(1).optional(),
    thumbnail: z.string().optional(),
    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().min(1).optional(),
    collaborators: z.array(z.string()).optional(),
    status: z.enum(['draft', 'pending', 'published', 'archived']).optional(),
    is_featured: z.boolean().optional(),
    is_premium: z.boolean().optional(),
    published_at: z.string().datetime().optional(),
    expired_at: z.string().datetime().optional(),
    layout: z.string().optional(),
  }),
});

export const articleByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const articlesOperationValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).nonempty('At least one article ID is required'),
  }),
});
