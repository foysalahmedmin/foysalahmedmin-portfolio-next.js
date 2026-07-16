import { z } from "zod";

export const newPasswordSchema = z
  .string()
  .min(12, "Password must be at least 12 characters")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/\d/, "Password must include a number")
  .refine((value) => Buffer.byteLength(value, "utf8") <= 72, {
    message: "Password cannot exceed 72 UTF-8 bytes",
  });

export const signinValidationSchema = z.object({
  body: z
    .object({
      email: z.string().email(),
      password: z.string().min(1).max(72),
    })
    .strict(),
});

const optionalIdSchema = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ID format",
  })
  .nullish();

export const signupValidationSchema = z.object({
  body: z
    .object({
      name: z.string().min(2).max(50),
      email: z.string().email(),
      password: newPasswordSchema,
      image: optionalIdSchema,
    })
    .strict(),
});

export const changePasswordValidationSchema = z.object({
  body: z
    .object({
      current_password: z.string().min(1).max(72),
      new_password: newPasswordSchema,
    })
    .refine((value) => value.current_password !== value.new_password, {
      message: "New password must be unique",
    })
    .strict(),
});

export const requestPasswordResetValidationSchema = z.object({
  body: z
    .object({
      email: z.string().trim().email().max(254),
    })
    .strict(),
});

export const resetPasswordValidationSchema = z.object({
  body: z
    .object({
      token: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
      password: newPasswordSchema,
    })
    .strict(),
});
