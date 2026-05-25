import { z } from 'zod';

export const signinValidationSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(6).max(12),
  }),
});

const optionalIdSchema = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: 'Invalid ID format',
  })
  .nullish();

export const signupValidationSchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    email: z.string().email(),
    password: z.string().min(6).max(12),
    image: optionalIdSchema,
  }),
});

export const refreshTokenValidationSchema = z.object({
  cookies: z.object({
    refresh_token: z.string(),
  }),
});

export const changePasswordValidationSchema = z.object({
  body: z
    .object({
      current_password: z.string().min(6).max(12),
      new_password: z.string().min(6).max(12),
    })
    .refine((value) => value.current_password !== value.new_password, {
      message: 'New password must be unique',
    }),
});

