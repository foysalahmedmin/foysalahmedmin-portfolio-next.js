import { z } from 'zod';

const newPasswordSchema = z
  .string()
  .min(8)
  .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, {
    message: 'Password cannot exceed 72 UTF-8 bytes',
  });

export const signinValidationSchema = z.object({
  body: z.object({
    email: z.string().email(),
    password: z.string().min(1).max(72),
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
    password: newPasswordSchema,
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
      current_password: z.string().min(1).max(72),
      new_password: newPasswordSchema,
    })
    .refine((value) => value.current_password !== value.new_password, {
      message: 'New password must be unique',
    }),
});
