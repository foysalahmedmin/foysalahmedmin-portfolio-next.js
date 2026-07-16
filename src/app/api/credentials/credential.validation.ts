import { z } from "zod";
import {
  commonCreateFields,
  commonUpdateFields,
  objectIdSchema,
  safeUrlSchema,
} from "../repeatable-content/record.validation";
import { CREDENTIAL_TYPES } from "./credential.type";

const VERIFICATION_SOURCES = ["issuer", "document", "manual_review"] as const;

const addDateIssues = (
  value: Record<string, unknown>,
  context: z.RefinementCtx
) => {
  if (
    value.issued_at &&
    value.expires_at &&
    new Date(String(value.issued_at)) >= new Date(String(value.expires_at))
  ) {
    context.addIssue({
      code: "custom",
      path: ["expires_at"],
      message: "Credential expiry must follow its issue date",
    });
  }
};

export const createCredentialSchema = z
  .object({
    ...commonCreateFields,
    claim_verification: z
      .enum(["unverified", "verified"])
      .default("unverified"),
    type: z.enum(CREDENTIAL_TYPES),
    issuer: z.string().trim().min(1).max(180),
    issued_at: z.iso.datetime(),
    expires_at: z.iso.datetime().nullable().optional(),
    credential_url: safeUrlSchema.optional(),
    credential_id: z.string().trim().min(1).max(180).optional(),
    verification_source: z.enum(VERIFICATION_SOURCES).optional(),
    verification_reference: z.string().trim().min(1).max(240).optional(),
    verified_at: z.iso.datetime().optional(),
    verified_by: objectIdSchema.optional(),
    visual_file: objectIdSchema.nullable().optional(),
    proof_file: objectIdSchema.nullable().optional(),
  })
  .strict()
  .superRefine(addDateIssues);

export const updateCredentialSchema = z
  .object({
    ...commonUpdateFields,
    claim_verification: z.enum(["unverified", "verified"]).optional(),
    type: z.enum(CREDENTIAL_TYPES).optional(),
    issuer: z.string().trim().min(1).max(180).optional(),
    issued_at: z.iso.datetime().optional(),
    expires_at: z.iso.datetime().nullable().optional(),
    credential_url: safeUrlSchema.nullable().optional(),
    credential_id: z.string().trim().min(1).max(180).nullable().optional(),
    verification_source: z.enum(VERIFICATION_SOURCES).nullable().optional(),
    verification_reference: z
      .string()
      .trim()
      .min(1)
      .max(240)
      .nullable()
      .optional(),
    verified_at: z.iso.datetime().nullable().optional(),
    verified_by: objectIdSchema.nullable().optional(),
    visual_file: objectIdSchema.nullable().optional(),
    proof_file: objectIdSchema.nullable().optional(),
  })
  .strict()
  .superRefine(addDateIssues);
