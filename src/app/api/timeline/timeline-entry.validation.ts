import { z } from "zod";
import { shortTextListSchema } from "../repeatable-content/record.constants";
import {
  commonCreateFields,
  commonUpdateFields,
  objectIdSchema,
} from "../repeatable-content/record.validation";
import { TIMELINE_ENTRY_TYPES } from "./timeline-entry.type";

const VERIFICATION_SOURCES = [
  "document",
  "public_record",
  "manual_review",
] as const;

const addTimelineIssues = (
  value: Record<string, unknown>,
  context: z.RefinementCtx
) => {
  if (value.is_current === true && value.ended_at) {
    context.addIssue({
      code: "custom",
      path: ["ended_at"],
      message: "A current timeline entry cannot have an end date",
    });
  }
  if (value.started_at && value.ended_at) {
    if (new Date(String(value.started_at)) > new Date(String(value.ended_at))) {
      context.addIssue({
        code: "custom",
        path: ["ended_at"],
        message: "The end date cannot precede the start date",
      });
    }
  }
};

export const createTimelineEntrySchema = z
  .object({
    ...commonCreateFields,
    claim_verification: z
      .enum(["unverified", "derived", "verified"])
      .default("unverified"),
    type: z.enum(TIMELINE_ENTRY_TYPES),
    organization: z.string().trim().min(1).max(180),
    position: z.string().trim().min(1).max(180),
    location: z.string().trim().min(1).max(160).optional(),
    started_at: z.iso.datetime(),
    ended_at: z.iso.datetime().nullable().optional(),
    is_current: z.boolean().default(false),
    highlights: shortTextListSchema.default([]),
    technologies: shortTextListSchema.default([]),
    verification_source: z.enum(VERIFICATION_SOURCES).optional(),
    verification_reference: z.string().trim().min(1).max(240).optional(),
    verified_at: z.iso.datetime().optional(),
    verified_by: objectIdSchema.optional(),
    visual_file: objectIdSchema.nullable().optional(),
  })
  .strict()
  .superRefine(addTimelineIssues);

export const updateTimelineEntrySchema = z
  .object({
    ...commonUpdateFields,
    claim_verification: z
      .enum(["unverified", "derived", "verified"])
      .optional(),
    type: z.enum(TIMELINE_ENTRY_TYPES).optional(),
    organization: z.string().trim().min(1).max(180).optional(),
    position: z.string().trim().min(1).max(180).optional(),
    location: z.string().trim().min(1).max(160).nullable().optional(),
    started_at: z.iso.datetime().optional(),
    ended_at: z.iso.datetime().nullable().optional(),
    is_current: z.boolean().optional(),
    highlights: shortTextListSchema.optional(),
    technologies: shortTextListSchema.optional(),
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
  })
  .strict()
  .superRefine(addTimelineIssues);
