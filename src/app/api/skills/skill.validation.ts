import { z } from "zod";
import { shortTextListSchema } from "../repeatable-content/record.constants";
import {
  commonCreateFields,
  commonUpdateFields,
  objectIdSchema,
} from "../repeatable-content/record.validation";
import { SKILL_EVIDENCE_SOURCES, SKILL_PROFICIENCY_LEVELS } from "./skill.type";

const evidenceFields = {
  evidence_source: z.enum(SKILL_EVIDENCE_SOURCES).optional(),
  evidence_reference: z.string().trim().min(1).max(240).optional(),
  evidence_verified_at: z.iso.datetime().optional(),
  evidence_verified_by: objectIdSchema.optional(),
};

const addEvidenceIssues = (
  value: Record<string, unknown>,
  context: z.RefinementCtx
) => {
  const verification = value.claim_verification;
  if (verification === "derived" || verification === "verified") {
    for (const field of ["evidence_source", "evidence_reference"] as const) {
      if (!value[field]) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Published proficiency requires bounded evidence metadata",
        });
      }
    }
  }
  if (verification === "verified") {
    for (const field of [
      "evidence_verified_at",
      "evidence_verified_by",
    ] as const) {
      if (!value[field]) {
        context.addIssue({
          code: "custom",
          path: [field],
          message: "Verified proficiency requires reviewer and timestamp",
        });
      }
    }
  }
};

export const createSkillSchema = z
  .object({
    ...commonCreateFields,
    claim_verification: z
      .enum(["unverified", "derived", "verified"])
      .default("unverified"),
    group: objectIdSchema,
    proficiency_level: z.enum(SKILL_PROFICIENCY_LEVELS),
    ...evidenceFields,
    years_experience: z.number().min(0).max(60).optional(),
    keywords: shortTextListSchema.default([]),
    icon_file: objectIdSchema.nullable().optional(),
  })
  .strict()
  .superRefine(addEvidenceIssues);

export const updateSkillSchema = z
  .object({
    ...commonUpdateFields,
    claim_verification: z
      .enum(["unverified", "derived", "verified"])
      .optional(),
    group: objectIdSchema.optional(),
    proficiency_level: z.enum(SKILL_PROFICIENCY_LEVELS).optional(),
    ...evidenceFields,
    evidence_source: z.enum(SKILL_EVIDENCE_SOURCES).nullable().optional(),
    evidence_reference: z.string().trim().min(1).max(240).nullable().optional(),
    evidence_verified_at: z.iso.datetime().nullable().optional(),
    evidence_verified_by: objectIdSchema.nullable().optional(),
    years_experience: z.number().min(0).max(60).nullable().optional(),
    keywords: shortTextListSchema.optional(),
    icon_file: objectIdSchema.nullable().optional(),
  })
  .strict();
