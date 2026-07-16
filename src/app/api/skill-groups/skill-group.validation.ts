import { z } from "zod";
import { contentIconKeySchema } from "../repeatable-content/record.constants";
import {
  commonCreateFields,
  commonUpdateFields,
  objectIdSchema,
} from "../repeatable-content/record.validation";

export const createSkillGroupSchema = z
  .object({
    ...commonCreateFields,
    description: z.string().trim().min(1).max(1_200),
    icon_key: contentIconKeySchema.optional(),
    visual_file: objectIdSchema.nullable().optional(),
  })
  .strict();

export const updateSkillGroupSchema = z
  .object({
    ...commonUpdateFields,
    description: z.string().trim().min(1).max(1_200).optional(),
    icon_key: contentIconKeySchema.nullable().optional(),
    visual_file: objectIdSchema.nullable().optional(),
  })
  .strict();
