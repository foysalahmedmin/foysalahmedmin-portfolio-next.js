import { z } from 'zod';

export const createArticleCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    slug: z.string().min(1).max(50),
    sequence: z.number().min(1).max(100),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    thumbnail: z.string().optional(),
    parent: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive']).default('active'),
    tags: z.array(z.string()).default([]),
    layout: z.string().default('default'),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      })
      .optional(),
  }),
});

export const updateArticleCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    slug: z.string().min(1).max(50).optional(),
    sequence: z.number().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    thumbnail: z.string().optional(),
    parent: z.string().optional().nullable(),
    status: z.enum(['active', 'inactive']).optional(),
    tags: z.array(z.string()).optional(),
    layout: z.string().optional(),
    seo: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        keywords: z.array(z.string()).optional(),
      })
      .optional(),
  }),
});

