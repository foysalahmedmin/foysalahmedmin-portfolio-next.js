import { z } from "zod";
import {
  contentIconKeySchema,
  shortTextListSchema,
} from "../repeatable-content/record.constants";
import { canonicalSlugSchema } from "@/lib/content/slug.schema";
import {
  commonCreateFields,
  commonUpdateFields,
  objectIdSchema,
  safeKeySchema,
  safePlainTextSchema,
} from "../repeatable-content/record.validation";
import { SERVICE_PROBLEMS_MAX } from "./service.type";

const serviceProblemSchema = z
  .object({
    key: safeKeySchema,
    pain: safePlainTextSchema(2, 200),
    approach: safePlainTextSchema(2, 500),
    deliverable: safePlainTextSchema(2, 240).optional(),
    outcome: safePlainTextSchema(2, 300).optional(),
    case_slug: canonicalSlugSchema.optional(),
  })
  .strict();

export const serviceProblemsSchema = z
  .array(serviceProblemSchema)
  .max(SERVICE_PROBLEMS_MAX)
  .superRefine((problems, context) => {
    const seen = new Set<string>();
    problems.forEach(({ key }, index) => {
      if (seen.has(key)) {
        context.addIssue({
          code: "custom",
          path: [index, "key"],
          message: "Problem keys must be unique",
        });
      }
      seen.add(key);
    });
  });

export const createServiceSchema = z
  .object({
    ...commonCreateFields,
    outcome: z.string().trim().min(1).max(600),
    capabilities: shortTextListSchema.min(1),
    deliverables: shortTextListSchema.default([]),
    technologies: shortTextListSchema.default([]),
    problems: serviceProblemsSchema.default([]),
    icon_key: contentIconKeySchema.optional(),
    visual_file: objectIdSchema.nullable().optional(),
  })
  .strict();

export const updateServiceSchema = z
  .object({
    ...commonUpdateFields,
    outcome: z.string().trim().min(1).max(600).optional(),
    capabilities: shortTextListSchema.min(1).optional(),
    deliverables: shortTextListSchema.optional(),
    technologies: shortTextListSchema.optional(),
    problems: serviceProblemsSchema.optional(),
    icon_key: contentIconKeySchema.nullable().optional(),
    visual_file: objectIdSchema.nullable().optional(),
  })
  .strict();
