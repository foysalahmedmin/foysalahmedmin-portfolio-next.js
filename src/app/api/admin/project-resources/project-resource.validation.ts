import { z } from 'zod';

export const createProjectResourceSchema = z.object({
  body: z.object({
    project: z.string().min(1),
    sequence: z.number().min(1),
    title: z.string().min(1),
    url: z.string().url(),
    type: z.enum(['repository', 'design', 'documentation', 'other']).default('other'),
    description: z.string().max(300).optional(),
    is_private: z.boolean().default(false),
  }),
});

export const updateProjectResourceSchema = z.object({
  body: z.object({
    sequence: z.number().min(1).optional(),
    type: z.enum(['repository', 'design', 'documentation', 'other']).optional(),
    title: z.string().min(1).optional(),
    url: z.string().url().optional(),
    description: z.string().max(300).optional(),
    is_private: z.boolean().optional(),
  }),
});

