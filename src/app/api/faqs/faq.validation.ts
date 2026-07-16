import { z } from "zod";
import { shortTextListSchema } from "../repeatable-content/record.constants";
import {
  commonCreateFields,
  commonUpdateFields,
  objectIdSchema,
} from "../repeatable-content/record.validation";
import { FAQ_CATEGORIES } from "./faq.type";

export const createFAQSchema = z
  .object({
    ...commonCreateFields,
    answer: z.string().trim().min(1).max(5_000),
    category: z.enum(FAQ_CATEGORIES).default("general"),
    keywords: shortTextListSchema.default([]),
    visual_file: objectIdSchema.nullable().optional(),
  })
  .strict();

export const updateFAQSchema = z
  .object({
    ...commonUpdateFields,
    answer: z.string().trim().min(1).max(5_000).optional(),
    category: z.enum(FAQ_CATEGORIES).optional(),
    keywords: shortTextListSchema.optional(),
    visual_file: objectIdSchema.nullable().optional(),
  })
  .strict();
