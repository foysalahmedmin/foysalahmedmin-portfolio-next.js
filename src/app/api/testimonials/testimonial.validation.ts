import { z } from "zod";
import {
  commonCreateFields,
  commonUpdateFields,
  objectIdSchema,
  safeUrlSchema,
} from "../repeatable-content/record.validation";
import {
  TESTIMONIAL_CONSENT_SCOPES,
  TESTIMONIAL_RELATIONSHIPS,
  TESTIMONIAL_SOURCE_TYPES,
} from "./testimonial.type";

const addConsentIssues = (
  value: Record<string, unknown>,
  context: z.RefinementCtx
) => {
  if (value.consent_status === "granted") {
    if (!value.consented_at) {
      context.addIssue({
        code: "custom",
        path: ["consented_at"],
        message: "Granted consent requires its confirmation time",
      });
    }
    if (
      !Array.isArray(value.consent_scopes) ||
      !value.consent_scopes.includes("public_site")
    ) {
      context.addIssue({
        code: "custom",
        path: ["consent_scopes"],
        message: "Public publication requires explicit public-site consent",
      });
    }
  }
};

export const createTestimonialSchema = z
  .object({
    ...commonCreateFields,
    claim_verification: z
      .enum(["unverified", "verified"])
      .default("unverified"),
    quote: z.string().trim().min(1).max(2_000),
    person_name: z.string().trim().min(1).max(160),
    person_role: z.string().trim().min(1).max(160).optional(),
    organization: z.string().trim().min(1).max(180).optional(),
    relationship: z.enum(TESTIMONIAL_RELATIONSHIPS),
    source_type: z.enum(TESTIMONIAL_SOURCE_TYPES),
    source_reference: z.string().trim().min(1).max(240).optional(),
    source_label: z.string().trim().min(1).max(160).optional(),
    source_url: safeUrlSchema.optional(),
    consent_status: z
      .enum(["pending", "granted", "revoked"])
      .default("pending"),
    consent_scopes: z
      .array(z.enum(TESTIMONIAL_CONSENT_SCOPES))
      .max(3)
      .default([]),
    consented_at: z.iso.datetime().optional(),
    verified_at: z.iso.datetime().optional(),
    verified_by: objectIdSchema.optional(),
    avatar_file: objectIdSchema.nullable().optional(),
    proof_file: objectIdSchema.nullable().optional(),
  })
  .strict()
  .superRefine(addConsentIssues);

export const updateTestimonialSchema = z
  .object({
    ...commonUpdateFields,
    claim_verification: z.enum(["unverified", "verified"]).optional(),
    quote: z.string().trim().min(1).max(2_000).optional(),
    person_name: z.string().trim().min(1).max(160).optional(),
    person_role: z.string().trim().min(1).max(160).nullable().optional(),
    organization: z.string().trim().min(1).max(180).nullable().optional(),
    relationship: z.enum(TESTIMONIAL_RELATIONSHIPS).optional(),
    source_type: z.enum(TESTIMONIAL_SOURCE_TYPES).optional(),
    source_reference: z.string().trim().min(1).max(240).nullable().optional(),
    source_label: z.string().trim().min(1).max(160).nullable().optional(),
    source_url: safeUrlSchema.nullable().optional(),
    consent_status: z.enum(["pending", "granted", "revoked"]).optional(),
    consent_scopes: z
      .array(z.enum(TESTIMONIAL_CONSENT_SCOPES))
      .max(3)
      .optional(),
    consented_at: z.iso.datetime().nullable().optional(),
    verified_at: z.iso.datetime().nullable().optional(),
    verified_by: objectIdSchema.nullable().optional(),
    avatar_file: objectIdSchema.nullable().optional(),
    proof_file: objectIdSchema.nullable().optional(),
  })
  .strict();
