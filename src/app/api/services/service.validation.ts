import { z } from "zod";
import {
  contentIconKeySchema,
  shortTextListSchema,
} from "../repeatable-content/record.constants";
import {
  commonCreateFields,
  commonUpdateFields,
  objectIdSchema,
} from "../repeatable-content/record.validation";

export const createServiceSchema = z
  .object({
    ...commonCreateFields,
    outcome: z.string().trim().min(1).max(600),
    capabilities: shortTextListSchema.min(1),
    deliverables: shortTextListSchema.default([]),
    technologies: shortTextListSchema.default([]),
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
    icon_key: contentIconKeySchema.nullable().optional(),
    visual_file: objectIdSchema.nullable().optional(),
  })
  .strict();
