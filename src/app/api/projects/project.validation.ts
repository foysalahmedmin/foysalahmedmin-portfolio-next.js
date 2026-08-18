import { z } from "zod";
import { PILLAR_KEYS, pillarKeySchema } from "@/lib/content/pillars";
import {
  isAllowedPublicProjectUrl,
  LINK_VISIBILITIES,
  OUTCOME_VERIFICATION_STATES,
  PROJECT_DELIVERY_STATUSES,
  PROJECT_PUBLICATION_STATUSES,
  PROJECT_TYPES,
} from "@/lib/content/portfolio-contract";

const idSchema = z.string().refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
  message: "Invalid ID format",
});

const optionalIdSchema = z
  .string()
  .refine((val) => /^[0-9a-fA-F]{24}$/.test(val), {
    message: "Invalid ID format",
  })
  .nullish();

const statusSchema = z.enum([
  "planned",
  "in_progress",
  "on_hold",
  "completed",
  "cancelled",
]);

const canonicalUrlSchema = z
  .string()
  .max(2_048)
  .refine(isAllowedPublicProjectUrl, "Use an allowlisted public HTTPS URL");
const shortListSchema = z.array(z.string().trim().min(1).max(2_000)).max(50);
const outcomeSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(120),
    verification_state: z.enum(OUTCOME_VERIFICATION_STATES),
    evidence_reference: z.string().trim().max(500).optional(),
  })
  .superRefine((outcome, context) => {
    if (
      outcome.verification_state === "verified" &&
      !outcome.evidence_reference
    ) {
      context.addIssue({
        code: "custom",
        path: ["evidence_reference"],
        message: "Verified outcomes require a private evidence reference",
      });
    }
  });

const contractFields = {
  slug: z.string().trim().min(1).max(96).optional(),
  primary_pillar: pillarKeySchema.optional(),
  secondary_pillars: z.array(pillarKeySchema).max(PILLAR_KEYS.length - 1).optional(),
  delivery_status: z.enum(PROJECT_DELIVERY_STATUSES).optional(),
  publication_status: z.enum(PROJECT_PUBLICATION_STATUSES).optional(),
  project_type: z.enum(PROJECT_TYPES).optional(),
  problem: z.string().trim().max(5_000).optional(),
  constraints: shortListSchema.optional(),
  role: z.string().trim().max(1_000).optional(),
  architecture: z.string().trim().max(10_000).optional(),
  decisions: shortListSchema.optional(),
  implementation: z.string().trim().max(10_000).optional(),
  security: z.string().trim().max(10_000).optional(),
  performance_reliability: z.string().trim().max(10_000).optional(),
  outcomes: z.array(outcomeSchema).max(50).optional(),
  learnings: shortListSchema.optional(),
  live_url: canonicalUrlSchema.nullish(),
  live_url_visibility: z.enum(LINK_VISIBILITIES).optional(),
  source_url: canonicalUrlSchema.nullish(),
  source_url_visibility: z.enum(LINK_VISIBILITIES).optional(),
};

export const createProjectSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    ...contractFields,
    content: z.string().min(1).max(200_000),
    category: idSchema,
    description: z.string().max(300).optional(),
    thumbnail: optionalIdSchema,
    images: z.array(idSchema).optional(),
    tags: z.array(z.string()).optional(),
    client: idSchema.optional(),
    collaborators: z.array(idSchema).optional(),
    status: statusSchema.default("planned"),
    is_featured: z.boolean().default(false),
    is_premium: z.boolean().default(false),
    started_at: z.string().datetime().optional(),
    ended_at: z.string().datetime().optional(),
    layout: z.string().default("default"),
  }),
});

export const updateProjectsSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).min(1, "At least one project ID is required"),
    status: statusSchema.optional(),
    is_featured: z.boolean().optional(),
    category: idSchema.optional(),
  }),
});

export const updateProjectByIdSchema = z.object({
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
    client: idSchema.optional(),
    collaborators: z.array(idSchema).optional(),
    status: statusSchema.optional(),
    is_featured: z.boolean().optional(),
    is_premium: z.boolean().optional(),
    started_at: z.string().datetime().optional(),
    ended_at: z.string().datetime().optional(),
    layout: z.string().optional(),
  }),
});

export const projectByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const projectsOperationValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).nonempty("At least one project ID is required"),
  }),
});
