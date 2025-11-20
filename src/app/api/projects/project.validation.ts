import { z } from 'zod';

const slugSchema = z.string().min(1).max(100);

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    slug: z.string().min(1),
    content: z.string().min(1),
    category: z.string().min(1),
    description: z.string().max(300).optional(),
    thumbnail: z.string().optional(),
    images: z.array(z.string()).optional(),
    tags: z.array(z.string()).optional(),
    client: z.string().optional(),
    collaborators: z.array(z.string()).optional(),
    status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).default('planned'),
    is_featured: z.boolean().default(false),
    is_premium: z.boolean().default(false),
    started_at: z.string().datetime().optional(),
    ended_at: z.string().datetime().optional(),
    layout: z.string().default('default'),
  }),
});

export const updateProjectSchema = z.object({
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
    client: z.string().optional(),
    collaborators: z.array(z.string()).optional(),
    status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional(),
    is_featured: z.boolean().optional(),
    is_premium: z.boolean().optional(),
    started_at: z.string().datetime().optional(),
    ended_at: z.string().datetime().optional(),
    layout: z.string().optional(),
  }),
});

export const updateProjectsSchema = z.object({
  body: z.object({
    slugs: z
      .array(slugSchema, {
        required_error: 'At least one project slug is required',
        invalid_type_error: 'Project slugs must be an array of strings',
      })
      .nonempty('At least one project slug is required'),
    status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional(),
    is_featured: z.boolean().optional(),
    category: z.string().min(1).optional(),
  }),
});

export const projectOperationValidationSchema = z.object({
  params: z.object({
    slug: slugSchema,
  }),
});

export const projectsOperationValidationSchema = z.object({
  body: z.object({
    slugs: z.array(slugSchema).nonempty('At least one project slug is required'),
  }),
});
