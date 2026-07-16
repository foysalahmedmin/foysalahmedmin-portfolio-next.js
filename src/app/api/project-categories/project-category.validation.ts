import { z } from "zod";
import { MAX_CONTENT_SLUG_LENGTH } from "@/lib/content/slug";

const slugSchema = z.string().min(1).max(MAX_CONTENT_SLUG_LENGTH);

export const createProjectCategorySchema = z.object({
  body: z.object({
    name: z.string().min(2).max(50),
    slug: slugSchema,
    sequence: z.number().min(1).max(100),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    parent: z.string().optional().nullable(),
    status: z.enum(["active", "inactive"]).default("active"),
    tags: z.array(z.string()).default([]),
    layout: z.string().default("default"),
  }),
});

export const updateProjectCategorySchema = z.object({
  params: z.object({
    slug: slugSchema,
  }),
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    slug: slugSchema.optional(),
    sequence: z.number().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    parent: z.string().optional().nullable(),
    status: z.enum(["active", "inactive"]).optional(),
    tags: z.array(z.string()).optional(),
    layout: z.string().optional(),
  }),
});

export const updateProjectCategoriesSchema = z.object({
  body: z.object({
    slugs: z
      .array(slugSchema)
      .min(1, "At least one project category slug is required"),
    status: z.enum(["active", "inactive"]).optional(),
    parent: z.string().optional().nullable(),
  }),
});

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: "Invalid ID format",
});

export const updateProjectCategoryByIdSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    name: z.string().min(2).max(50).optional(),
    slug: slugSchema.optional(),
    sequence: z.number().min(1).max(100).optional(),
    description: z.string().max(500).optional(),
    icon: z.string().optional(),
    parent: z.string().optional().nullable(),
    status: z.enum(["active", "inactive"]).optional(),
    tags: z.array(z.string()).optional(),
    layout: z.string().optional(),
  }),
});

export const projectCategoryOperationValidationSchema = z.object({
  params: z.object({
    slug: slugSchema,
  }),
});

export const projectCategoryByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const projectCategoriesOperationValidationSchema = z.object({
  body: z.object({
    slugs: z
      .array(slugSchema)
      .nonempty("At least one project category slug is required"),
  }),
});

export const projectCategoryIdsOperationValidationSchema = z.object({
  body: z.object({
    ids: z
      .array(idSchema)
      .nonempty("At least one project category ID is required")
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Project category IDs must be unique",
      }),
  }),
});
