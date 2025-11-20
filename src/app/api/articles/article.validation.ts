import { z } from 'zod';

const slugSchema = z.string().min(1).max(100);

export const createArticleSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
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

export const updateArticleSchema = z.object({
  params: z.object({
    slug: slugSchema,
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
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

export const updateArticlesSchema = z.object({
  body: z.object({
    slugs: z
      .array(slugSchema, {
        required_error: 'At least one article slug is required',
        invalid_type_error: 'Article slugs must be an array of strings',
      })
      .nonempty('At least one article slug is required'),
    status: z.enum(['draft', 'pending', 'published', 'archived']).optional(),
    is_featured: z.boolean().optional(),
    category: z.string().min(1).optional(),
  }),
});

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: 'Invalid ID format',
});

export const updateArticleByIdSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    slug: z.string().min(1).optional(),
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

export const articleOperationValidationSchema = z.object({
  params: z.object({
    slug: slugSchema,
  }),
});

export const articleByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const articlesOperationValidationSchema = z.object({
  body: z.object({
    slugs: z.array(slugSchema).nonempty('At least one article slug is required'),
  }),
});
