import { z } from "zod";
import { PILLAR_KEYS, pillarKeySchema } from "@/lib/content/pillars";

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: "Invalid ID format",
});

const optionalIdSchema = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ID format",
  })
  .nullish();

const statusSchema = z.enum(["draft", "pending", "published", "archived"]);

const contractFields = {
  slug: z.string().trim().min(1).max(96).optional(),
  excerpt: z.string().trim().max(500).optional(),
  primary_pillar: pillarKeySchema.optional(),
  secondary_pillars: z.array(pillarKeySchema).max(PILLAR_KEYS.length - 1).optional(),
  topics: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  reading_time_minutes: z.number().int().min(1).max(600).optional(),
  reading_time_source: z.enum(["derived", "manual"]).optional(),
};

export const createArticleSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    ...contractFields,
    content: z.string().min(1).max(200_000),
    category: idSchema,
    description: z.string().max(300).optional(),
    thumbnail: optionalIdSchema,
    images: z.array(idSchema).optional(),
    tags: z.array(z.string()).optional(),
    collaborators: z.array(idSchema).optional(),
    status: statusSchema.default("draft"),
    is_featured: z.boolean().default(false),
    is_premium: z.boolean().default(false),
    published_at: z.string().datetime().optional(),
    expired_at: z.string().datetime().nullish(),
    layout: z.string().default("default"),
  }),
});

export const updateArticlesSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).min(1, "At least one article ID is required"),
    status: statusSchema.optional(),
    is_featured: z.boolean().optional(),
    category: idSchema.optional(),
  }),
});

export const updateArticleByIdSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    name: z.string().min(1).optional(),
    ...contractFields,
    description: z.string().max(300).optional(),
    content: z.string().min(1).max(200_000).optional(),
    thumbnail: optionalIdSchema,
    images: z.array(idSchema).optional(),
    tags: z.array(z.string()).optional(),
    category: idSchema.optional(),
    collaborators: z.array(idSchema).optional(),
    status: statusSchema.optional(),
    is_featured: z.boolean().optional(),
    is_premium: z.boolean().optional(),
    published_at: z.string().datetime().optional(),
    expired_at: z.string().datetime().nullish(),
    layout: z.string().optional(),
  }),
});

export const articleByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const articlesOperationValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).nonempty("At least one article ID is required"),
  }),
});
