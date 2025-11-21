import { z } from 'zod';

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1),
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

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: 'Invalid ID format',
});

export const updateProjectsSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).min(1, 'At least one project ID is required'),
    status: z.enum(['planned', 'in_progress', 'on_hold', 'completed', 'cancelled']).optional(),
    is_featured: z.boolean().optional(),
    category: z.string().min(1).optional(),
  }),
});

export const updateProjectByIdSchema = z.object({
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

export const projectByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const projectsOperationValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).nonempty('At least one project ID is required'),
  }),
});
