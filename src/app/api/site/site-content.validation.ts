import { z } from "zod";
import {
  SITE_DELIVERABLE_KINDS,
  SITE_WORKFLOW_NODE_KINDS,
  type TSiteCommitment,
  type TSiteDeliverableSample,
  type TSiteEngagementModel,
  type TSiteFinder,
  type TSiteFit,
  type TSiteNextStep,
  type TSiteWorkflowExample,
} from "./site.type";

// Zod-only on purpose: the Site editor (a client component) validates these shapes in the browser, and
// importing site.validation there would pull the server policy and media code into shared chunks.

export const safeKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/);

export const requiredText = (minimum: number, maximum: number) =>
  z.string().trim().min(minimum).max(maximum);

export const safePlainText = (minimum: number, maximum: number) =>
  requiredText(minimum, maximum).refine(
    (value) =>
      !/[<>\u0000-\u001f\u007f]/.test(value) &&
      !/(?:javascript|data|vbscript)\s*:/i.test(value),
    "Use plain text without markup or executable content"
  );

export const optionalSafeText = (minimum: number, maximum: number) =>
  z.preprocess(
    (value) =>
      typeof value === "string" && value.trim() === "" ? undefined : value,
    safePlainText(minimum, maximum).optional()
  );

export const uniqueKeys = <T extends { key: string }>(
  values: readonly T[]
): boolean => new Set(values.map((value) => value.key)).size === values.length;

export const verificationSchema = z.enum(["unverified", "derived", "verified"]);

export const slugSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

/** An excerpt keeps its line breaks; every other control character and any markup opener is refused. */
const excerptText = (minimum: number, maximum: number) =>
  requiredText(minimum, maximum).refine(
    (value) =>
      !/[<\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value) &&
      !/(?:javascript|data|vbscript)\s*:/i.test(value),
    "Use plain text without markup or executable content"
  );

export const siteEngagementModelSchema: z.ZodType<TSiteEngagementModel> = z
  .object({
    key: safeKeySchema,
    name: safePlainText(2, 80),
    best_when: optionalSafeText(2, 300),
    you_get: z.array(safePlainText(2, 200)).max(6).default([]),
    how_it_runs: optionalSafeText(2, 300),
    duration_label: optionalSafeText(2, 80),
    price_label: optionalSafeText(2, 80),
    verification: verificationSchema,
    enabled: z.boolean(),
  })
  .strict();

export const siteCommitmentSchema: z.ZodType<TSiteCommitment> = z
  .object({
    key: safeKeySchema,
    title: safePlainText(2, 100),
    summary: safePlainText(2, 300),
    enabled: z.boolean(),
  })
  .strict();

export const siteNextStepSchema: z.ZodType<TSiteNextStep> = z
  .object({
    key: safeKeySchema,
    title: safePlainText(2, 80),
    summary: safePlainText(2, 240),
    enabled: z.boolean(),
  })
  .strict();

export const siteWorkflowExampleSchema: z.ZodType<TSiteWorkflowExample> = z
  .object({
    title: safePlainText(2, 120),
    caption: safePlainText(2, 300),
    illustrative: z.literal(true),
    nodes: z
      .array(
        z
          .object({
            key: safeKeySchema,
            kind: z.enum(SITE_WORKFLOW_NODE_KINDS),
            label: safePlainText(1, 40),
            summary: safePlainText(2, 200),
            on_failure: optionalSafeText(2, 160),
          })
          .strict()
      )
      .min(2)
      .max(8)
      .refine(uniqueKeys, "Workflow node keys must be unique"),
    switch_off: optionalSafeText(2, 200),
  })
  .strict();

export const siteDeliverableSampleSchema: z.ZodType<TSiteDeliverableSample> = z
  .object({
    key: safeKeySchema,
    title: safePlainText(2, 100),
    kind: z.enum(SITE_DELIVERABLE_KINDS),
    excerpt: excerptText(2, 1_200),
    source_label: safePlainText(2, 120),
    source_slug: slugSchema.optional(),
    verification: verificationSchema,
    enabled: z.boolean(),
  })
  .strict();

export const siteFitSchema: z.ZodType<TSiteFit> = z
  .object({
    enabled: z.boolean(),
    segments: z
      .array(
        z
          .object({
            key: safeKeySchema,
            label: safePlainText(1, 60),
            for_you_if: safePlainText(2, 240),
          })
          .strict()
      )
      .max(6)
      .refine(uniqueKeys, "Fit segment keys must be unique"),
    not_a_fit: z.array(safePlainText(2, 200)).max(6),
  })
  .strict();

export const siteFinderSchema: z.ZodType<TSiteFinder> = z
  .object({
    enabled: z.boolean(),
    steps: z
      .array(
        z
          .object({
            key: safeKeySchema,
            question: safePlainText(2, 140),
            options: z
              .array(
                z
                  .object({
                    key: safeKeySchema,
                    label: safePlainText(1, 80),
                    tags: z.array(safeKeySchema).min(1).max(4),
                  })
                  .strict()
              )
              .min(2)
              .max(6)
              .refine(uniqueKeys, "Finder option keys must be unique"),
          })
          .strict()
      )
      .max(4)
      .refine(uniqueKeys, "Finder step keys must be unique"),
    outcomes: z
      .array(
        z
          .object({
            engagement_key: safeKeySchema,
            when_tags: z.array(safeKeySchema).min(1).max(4),
            reasoning: safePlainText(2, 240),
          })
          .strict()
      )
      .max(8),
  })
  .strict();
