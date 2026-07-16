import { z } from "zod";
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: "Invalid ID format",
});

export const createProjectResourceSchema = z.object({
  body: z.object({
    project: z.string().min(1),
    sequence: z.number().min(1),
    title: z.string().min(1),
    url: z.string().max(2048).refine(isAllowedPublicProjectUrl),
    type: z
      .enum(["repository", "design", "documentation", "other"])
      .default("other"),
    description: z.string().max(300).optional(),
    is_private: z.boolean().default(true),
  }),
});

export const updateProjectResourceSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    sequence: z.number().min(1).optional(),
    type: z.enum(["repository", "design", "documentation", "other"]).optional(),
    title: z.string().min(1).optional(),
    url: z.string().max(2048).refine(isAllowedPublicProjectUrl).optional(),
    description: z.string().max(300).optional(),
    is_private: z.boolean().optional(),
  }),
});

export const updateProjectResourcesSchema = z.object({
  body: z.object({
    ids: z
      .array(idSchema)
      .min(1, "At least one project resource ID is required"),
    type: z.enum(["repository", "design", "documentation", "other"]).optional(),
    is_private: z.boolean().optional(),
  }),
});

export const projectResourceOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const projectResourcesOperationValidationSchema = z.object({
  body: z.object({
    ids: z
      .array(idSchema)
      .nonempty("At least one project resource ID is required"),
  }),
});
