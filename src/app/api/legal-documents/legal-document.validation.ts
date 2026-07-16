import { z } from "zod";
import {
  commonCreateFields,
  commonUpdateFields,
  objectIdSchema,
} from "../repeatable-content/record.validation";
import { LEGAL_DOCUMENT_TYPES } from "./legal-document.type";

const documentVersionSchema = z
  .string()
  .regex(/^\d{1,4}\.\d{1,4}(?:\.\d{1,4})?$/, "Use a numeric document version");
const sectionSchema = z
  .object({
    key: z
      .string()
      .min(1)
      .max(64)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    heading: z.string().trim().min(1).max(180),
    body: z.string().trim().min(1).max(10_000),
  })
  .strict();

const uniqueSectionKeys = (
  value: { sections?: Array<{ key: string }> },
  context: z.RefinementCtx
) => {
  if (
    value.sections &&
    new Set(value.sections.map(({ key }) => key)).size !== value.sections.length
  ) {
    context.addIssue({
      code: "custom",
      path: ["sections"],
      message: "Legal section keys must be unique",
    });
  }
};

export const createLegalDocumentSchema = z
  .object({
    ...commonCreateFields,
    claim_verification: z.literal("not_applicable").default("not_applicable"),
    type: z.enum(LEGAL_DOCUMENT_TYPES),
    document_version: documentVersionSchema,
    effective_at: z.iso.datetime(),
    sections: z.array(sectionSchema).min(1).max(50),
    reviewed_at: z.iso.datetime().optional(),
    reviewed_by: objectIdSchema.optional(),
    supersedes: objectIdSchema.nullable().optional(),
    document_file: objectIdSchema.nullable().optional(),
  })
  .strict()
  .superRefine(uniqueSectionKeys);

export const updateLegalDocumentSchema = z
  .object({
    ...commonUpdateFields,
    claim_verification: z.literal("not_applicable").optional(),
    type: z.enum(LEGAL_DOCUMENT_TYPES).optional(),
    document_version: documentVersionSchema.optional(),
    effective_at: z.iso.datetime().optional(),
    sections: z.array(sectionSchema).min(1).max(50).optional(),
    reviewed_at: z.iso.datetime().nullable().optional(),
    reviewed_by: objectIdSchema.nullable().optional(),
    supersedes: objectIdSchema.nullable().optional(),
    document_file: objectIdSchema.nullable().optional(),
  })
  .strict()
  .superRefine(uniqueSectionKeys);
