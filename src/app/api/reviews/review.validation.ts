import { z } from 'zod';

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: 'Invalid ID format',
});

export const createReviewSchema = z.object({
  body: z.object({
    target: idSchema,
    target_model: z.enum(['Project', 'Article']),
    rating: z.number().min(1).max(5),
    review: z.string().min(1).max(300),
  }),
});

export const updateReviewSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    rating: z.number().min(1).max(5).optional(),
    review: z.string().min(1).max(300).optional(),
  }),
});

export const reviewByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const reviewsOperationValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).nonempty('At least one review ID is required'),
  }),
});

export const updateReviewsSchema = z.object({
  body: z.object({
    ids: z
      .array(idSchema)
      .nonempty('At least one review ID is required'),
    status: z.enum(['pending', 'approved', 'rejected']).optional(),
  }),
});

export const updateReviewStatusSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    status: z.enum(['pending', 'approved', 'rejected']),
  }),
});

