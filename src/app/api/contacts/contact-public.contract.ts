import { z } from "zod";

export const CONTACT_FIELD_LIMITS = {
  name: 100,
  email: 254,
  subject: 200,
  message: 2_000,
} as const;

const noHeaderBreaks = /^[^\r\n]*$/;
const noUnsafeControlCharacters =
  /^[^\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]*$/u;

export const contactSubmissionSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter at least 2 characters.")
      .max(CONTACT_FIELD_LIMITS.name, "Name is too long.")
      .regex(noHeaderBreaks, "Name must be on one line.")
      .regex(
        noUnsafeControlCharacters,
        "Name contains unsupported characters."
      ),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .max(CONTACT_FIELD_LIMITS.email, "Email is too long.")
      .email("Enter a valid email address.")
      .regex(noHeaderBreaks, "Email must be on one line."),
    subject: z
      .string()
      .trim()
      .min(2, "Enter at least 2 characters.")
      .max(CONTACT_FIELD_LIMITS.subject, "Subject is too long.")
      .regex(noHeaderBreaks, "Subject must be on one line.")
      .regex(
        noUnsafeControlCharacters,
        "Subject contains unsupported characters."
      ),
    message: z
      .string()
      .trim()
      .min(10, "Enter at least 10 characters.")
      .max(CONTACT_FIELD_LIMITS.message, "Message is too long.")
      .regex(
        noUnsafeControlCharacters,
        "Message contains unsupported characters."
      ),
    company_website: z.string().max(256).default(""),
    form_started_at: z.number().int().positive(),
  })
  .strict();

export const contactVisibleFieldsSchema = contactSubmissionSchema.pick({
  name: true,
  email: true,
  subject: true,
  message: true,
});

export type ContactSubmissionInput = z.input<typeof contactSubmissionSchema>;
export type ContactSubmission = z.output<typeof contactSubmissionSchema>;
export type ContactVisibleFields = z.output<typeof contactVisibleFieldsSchema>;

export type ContactPublicSuccess = {
  success: true;
  status: 200 | 201;
  message: string;
  data: {
    receipt: string;
    duplicate: boolean;
  };
};

export type ContactPublicError = {
  success: false;
  status: number;
  code:
    | "invalid_request"
    | "invalid_submission"
    | "origin_rejected"
    | "rate_limited"
    | "temporarily_unavailable";
  message: string;
  fields?: Record<string, string>;
};
