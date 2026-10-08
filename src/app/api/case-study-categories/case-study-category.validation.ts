import { z } from "zod";
import { MAX_CONTENT_SLUG_LENGTH } from "@/lib/content/slug";
import { categoryParentIdSchema } from "../category-parent-integrity";

const slugSchema = z.string().min(1).max(MAX_CONTENT_SLUG_LENGTH);

export const createCaseStudyCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    slug: slugSchema,
    sequence: z.number().min(1).max(100),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    parent: categoryParentIdSchema.optional().nullable(),
    status: z.enum(["active", "inactive"]).default("active"),
    tags: z.array(z.string()).default([]),
    layout: z.string().default("default"),
  }),
});

export const updateCaseStudyCategorySchema = z.object({
  params: z.object({
    slug: slugSchema,
  }),
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    slug: slugSchema.optional(),
    sequence: z.number().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    parent: categoryParentIdSchema.optional().nullable(),
    status: z.enum(["active", "inactive"]).optional(),
    tags: z.array(z.string()).optional(),
    layout: z.string().optional(),
  }),
});

export const updateCaseStudyCategoriesSchema = z.object({
  body: z.object({
    slugs: z
      .array(slugSchema)
      .nonempty("At least one case study category slug is required"),
    status: z.enum(["active", "inactive"]).optional(),
    parent: categoryParentIdSchema.optional().nullable(),
  }),
});

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: "Invalid ID format",
});

export const updateCaseStudyCategoryByIdSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    slug: slugSchema.optional(),
    sequence: z.number().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    parent: categoryParentIdSchema.optional().nullable(),
    status: z.enum(["active", "inactive"]).optional(),
    tags: z.array(z.string()).optional(),
    layout: z.string().optional(),
  }),
});

export const caseStudyCategoryOperationValidationSchema = z.object({
  params: z.object({
    slug: slugSchema,
  }),
});

export const caseStudyCategoryByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const caseStudyCategoriesOperationValidationSchema = z.object({
  body: z.object({
    slugs: z
      .array(slugSchema)
      .nonempty("At least one case study category slug is required"),
  }),
});

export const caseStudyCategoryIdsOperationValidationSchema = z.object({
  body: z.object({
    ids: z
      .array(idSchema)
      .nonempty("At least one case study category ID is required")
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Case study category IDs must be unique",
      }),
  }),
});
