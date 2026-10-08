import { z } from "zod";
import {
  CASE_STUDY_ENGAGEMENT_TYPES,
  CASE_STUDY_LINK_VISIBILITIES,
  CASE_STUDY_OUTCOME_STATES,
} from "@/lib/content/case-study-contract";
import { PILLAR_KEYS, pillarKeySchema } from "@/lib/content/pillars";
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";

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

const urlSchema = z
  .string()
  .max(2_048)
  .refine(isAllowedPublicProjectUrl, "Use an allowlisted public HTTPS URL");

const listSchema = (maxLength: number, maxItems: number) =>
  z.array(z.string().trim().min(1).max(maxLength)).max(maxItems);

const outcomeSchema = z
  .object({
    label: z.string().trim().min(1).max(120),
    value: z.string().trim().min(1).max(120),
    description: z.string().trim().max(500).optional(),
    verification_state: z.enum(CASE_STUDY_OUTCOME_STATES),
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

const contentFields = {
  slug: z.string().trim().min(1).max(96).optional(),
  description: z.string().trim().max(300).optional(),
  overview: z.string().trim().max(5_000).optional(),
  content: z.string().max(200_000).optional(),
  thumbnail: optionalIdSchema,
  images: z.array(idSchema).max(30).optional(),
  client_name: z.string().trim().max(120).optional(),
  show_client_name: z.boolean().optional(),
  client_industry: z.string().trim().max(120).optional(),
  client_location: z.string().trim().max(120).optional(),
  engagement_type: z.enum(CASE_STUDY_ENGAGEMENT_TYPES).optional(),
  primary_pillar: pillarKeySchema.optional(),
  secondary_pillars: z
    .array(pillarKeySchema)
    .max(PILLAR_KEYS.length - 1)
    .optional(),
  role: z.string().trim().max(500).optional(),
  team_size: z.number().int().min(1).max(1_000).optional(),
  duration_label: z.string().trim().max(80).optional(),
  started_at: z.string().datetime().optional(),
  ended_at: z.string().datetime().optional(),
  challenge: z.string().trim().max(5_000).optional(),
  approach: z.string().trim().max(8_000).optional(),
  solution: z.string().trim().max(8_000).optional(),
  key_decisions: listSchema(2_000, 50).optional(),
  results_summary: z.string().trim().max(3_000).optional(),
  outcomes: z.array(outcomeSchema).max(20).optional(),
  tech_stack: listSchema(60, 40).optional(),
  services: listSchema(80, 30).optional(),
  learnings: listSchema(2_000, 50).optional(),
  keywords: listSchema(60, 20).optional(),
  live_url: urlSchema.nullish(),
  live_url_visibility: z.enum(CASE_STUDY_LINK_VISIBILITIES).optional(),
  source_url: urlSchema.nullish(),
  source_url_visibility: z.enum(CASE_STUDY_LINK_VISIBILITIES).optional(),
};

export const createCaseStudySchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).max(200),
    ...contentFields,
    category: idSchema,
    status: statusSchema.default("draft"),
    is_featured: z.boolean().default(false),
    published_at: z.string().datetime().optional(),
    expired_at: z.string().datetime().nullish(),
    layout: z.string().default("default"),
  }),
});

export const updateCaseStudiesSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).min(1, "At least one case study ID is required"),
    status: statusSchema.optional(),
    is_featured: z.boolean().optional(),
    category: idSchema.optional(),
  }),
});

export const updateCaseStudyByIdSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
  body: z.object({
    name: z.string().trim().min(2).max(200).optional(),
    ...contentFields,
    category: idSchema.optional(),
    status: statusSchema.optional(),
    is_featured: z.boolean().optional(),
    published_at: z.string().datetime().optional(),
    expired_at: z.string().datetime().nullish(),
    layout: z.string().optional(),
  }),
});

export const caseStudyByIdOperationValidationSchema = z.object({
  params: z.object({
    id: idSchema,
  }),
});

export const caseStudiesOperationValidationSchema = z.object({
  body: z.object({
    ids: z.array(idSchema).nonempty("At least one case study ID is required"),
  }),
});
