import { CREDENTIAL_TYPES } from "@/app/api/credentials/credential.type";
import { FAQ_CATEGORIES } from "@/app/api/faqs/faq.type";
import { LEGAL_DOCUMENT_TYPES } from "@/app/api/legal-documents/legal-document.type";
import { TESTIMONIAL_RELATIONSHIPS } from "@/app/api/testimonials/testimonial.type";
import { TIMELINE_ENTRY_TYPES } from "@/app/api/timeline/timeline-entry.type";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { PROJECT_TYPES } from "@/lib/content/portfolio-contract";
import { z } from "zod";
import {
  PAGE_ROUTE_KEYS,
  PAGE_SECTION_ITEM_MAX,
  PAGE_SECTION_MAX,
  PAGE_SNAPSHOT_MAX_BYTES,
  type TPageDraftSnapshot,
  type TPageRouteKey,
  type TPageSection,
} from "./page.type";

export const pageRouteKeySchema = z.enum(PAGE_ROUTE_KEYS);
export const pageObjectIdSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-f0-9]{24}$/, "Invalid reference ID");
export const pageExpectedRevisionSchema = z
  .number()
  .int()
  .min(1)
  .max(1_000_000_000);

const safePlainText = (minimum: number, maximum: number) =>
  z
    .string()
    .trim()
    .min(minimum)
    .max(maximum)
    .refine(
      (value) =>
        !/[<>\u0000-\u001f\u007f]/.test(value) &&
        !/(?:javascript|data|vbscript)\s*:/i.test(value),
      "Use plain text without markup or executable content"
    );

const sectionKeySchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(64)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/);

const commonSection = {
  key: sectionKeySchema,
  visible: z.boolean(),
  heading: safePlainText(1, 100).optional(),
};

const curatedSourceSchema = z
  .object({
    mode: z.literal("curated"),
    ids: z
      .array(pageObjectIdSchema)
      .min(1)
      .max(PAGE_SECTION_ITEM_MAX)
      .refine((ids) => new Set(ids).size === ids.length, {
        message: "Curated reference IDs must be unique",
      }),
  })
  .strict();

const automaticSource = <T extends z.ZodRawShape>(filter: T) =>
  z
    .object({
      mode: z.literal("automatic"),
      filter: z.object(filter).strict(),
    })
    .strict();

const collectionSection = <
  TKind extends string,
  TLayouts extends readonly [string, ...string[]],
  TFilter extends z.ZodRawShape,
>(
  kind: TKind,
  layouts: TLayouts,
  filter: TFilter
) =>
  z
    .object({
      ...commonSection,
      kind: z.literal(kind),
      layout: z.enum(layouts),
      item_limit: z.number().int().min(1).max(PAGE_SECTION_ITEM_MAX),
      source: z.union([curatedSourceSchema, automaticSource(filter)]),
    })
    .strict()
    .superRefine((section, context) => {
      if (
        section.source.mode === "curated" &&
        section.source.ids.length > section.item_limit
      ) {
        context.addIssue({
          code: "custom",
          path: ["source", "ids"],
          message: "Curated references cannot exceed the item limit",
        });
      }
    });

const sharedContentFilter = {
  featured: z.boolean().optional(),
  pillar: z.enum(PILLAR_KEYS).optional(),
};

const systemSection = <
  TKind extends string,
  TLayouts extends readonly [string, ...string[]],
>(
  kind: TKind,
  layouts: TLayouts
) =>
  z
    .object({
      ...commonSection,
      kind: z.literal(kind),
      layout: z.enum(layouts),
      source: z.object({ mode: z.literal("system") }).strict(),
    })
    .strict();

export const pageSectionSchema = z.discriminatedUnion("kind", [
  systemSection("site-hero", ["default", "split", "immersive"]),
  systemSection("site-introduction", ["default", "split"]),
  systemSection("pillar-showcase", ["default", "compact", "sticky"]),
  systemSection("process-steps", ["default", "numbered", "compact"]),
  systemSection("metrics-strip", ["default", "compact"]),
  collectionSection("project-collection", ["grid", "featured", "list"], {
    ...sharedContentFilter,
    project_type: z.enum(PROJECT_TYPES).optional(),
  }),
  collectionSection("article-collection", ["grid", "featured", "list"], {
    ...sharedContentFilter,
  }),
  collectionSection("service-collection", ["grid", "cards", "list"], {
    ...sharedContentFilter,
  }),
  collectionSection("skill-group-collection", ["grid", "matrix", "list"], {
    ...sharedContentFilter,
  }),
  collectionSection("timeline", ["timeline", "compact", "list"], {
    ...sharedContentFilter,
    type: z.enum(TIMELINE_ENTRY_TYPES).optional(),
  }),
  collectionSection("credential-collection", ["grid", "compact", "list"], {
    ...sharedContentFilter,
    type: z.enum(CREDENTIAL_TYPES).optional(),
  }),
  collectionSection("faq-list", ["accordion", "list"], {
    ...sharedContentFilter,
    category: z.enum(FAQ_CATEGORIES).optional(),
  }),
  collectionSection("testimonial-collection", ["carousel", "grid", "list"], {
    featured: z.boolean().optional(),
    relationship: z.enum(TESTIMONIAL_RELATIONSHIPS).optional(),
  }),
  collectionSection("legal-document", ["document"], {
    type: z.enum(LEGAL_DOCUMENT_TYPES),
  }),
  systemSection("contact-form", ["default", "split"]),
  systemSection("contact-cta", ["default", "banner", "compact"]),
]);

export const pageDraftSnapshotSchema: z.ZodType<TPageDraftSnapshot> = z
  .object({
    seo: z
      .object({
        title: safePlainText(2, 120).optional(),
        description: safePlainText(10, 300).optional(),
        noindex: z.boolean().default(false),
      })
      .strict(),
    sections: z
      .array(pageSectionSchema)
      .min(1)
      .max(PAGE_SECTION_MAX)
      .refine(
        (sections) =>
          new Set(sections.map((section) => section.key)).size ===
          sections.length,
        "Section keys must be unique"
      ),
  })
  .strict()
  .transform((value) => value as TPageDraftSnapshot)
  .superRefine((snapshot, context) => {
    if (
      Buffer.byteLength(JSON.stringify(snapshot), "utf8") >
      PAGE_SNAPSHOT_MAX_BYTES
    ) {
      context.addIssue({
        code: "custom",
        path: [],
        message: "Page snapshot exceeds the storage budget",
      });
    }
  });

export const PAGE_ROUTE_SECTION_KINDS: Readonly<
  Record<TPageRouteKey, readonly TPageSection["kind"][]>
> = {
  home: [
    "site-hero",
    "metrics-strip",
    "pillar-showcase",
    "service-collection",
    "skill-group-collection",
    "project-collection",
    "article-collection",
    "process-steps",
    "testimonial-collection",
    "faq-list",
    "contact-cta",
  ],
  about: [
    "site-introduction",
    "skill-group-collection",
    "timeline",
    "credential-collection",
    "testimonial-collection",
    "faq-list",
    "contact-cta",
  ],
  projects: ["project-collection", "contact-cta"],
  articles: ["article-collection", "contact-cta"],
  contact: ["contact-form", "faq-list"],
  privacy: ["legal-document"],
  terms: ["legal-document"],
};

export const getPageRouteCompatibilityIssues = (
  routeKey: TPageRouteKey,
  snapshot: TPageDraftSnapshot
): string[] => {
  const allowed = PAGE_ROUTE_SECTION_KINDS[routeKey];
  const issues = snapshot.sections.flatMap((section, index) =>
    allowed.includes(section.kind) ? [] : [`sections.${index}.kind`]
  );
  if (routeKey === "privacy" || routeKey === "terms") {
    const expectedType = routeKey;
    snapshot.sections.forEach((section, index) => {
      if (
        section.kind === "legal-document" &&
        section.source.mode === "automatic" &&
        section.source.filter.type !== expectedType
      ) {
        issues.push(`sections.${index}.source.filter.type`);
      }
      if (section.kind === "legal-document" && section.item_limit !== 1) {
        issues.push(`sections.${index}.item_limit`);
      }
    });
  }
  return [...new Set(issues)];
};

export const parsePageDraftSnapshot = (
  routeKey: TPageRouteKey,
  input: unknown
): TPageDraftSnapshot => {
  const parsed = pageDraftSnapshotSchema.parse(input);
  const issues = getPageRouteCompatibilityIssues(routeKey, parsed);
  if (issues.length) {
    throw new z.ZodError(
      issues.map((path) => ({
        code: "custom" as const,
        path: path.split("."),
        message: "This section is not compatible with the fixed Page route",
      }))
    );
  }
  return parsed;
};

export const pageCreateBodySchema = z.object({ draft: z.unknown() }).strict();
export const pageUpdateBodySchema = z
  .object({
    expected_revision: pageExpectedRevisionSchema,
    draft: z.unknown(),
  })
  .strict();
export const pagePublishBodySchema = z
  .object({ expected_revision: pageExpectedRevisionSchema })
  .strict();
export const pageReorderBodySchema = z
  .object({
    expected_revision: pageExpectedRevisionSchema,
    ordered_section_keys: z
      .array(sectionKeySchema)
      .min(1)
      .max(PAGE_SECTION_MAX)
      .refine((keys) => new Set(keys).size === keys.length, {
        message: "Ordered section keys must be unique",
      }),
  })
  .strict();

export const parseEmptyPageQuery = (query: URLSearchParams): void => {
  if ([...query.keys()].length) {
    throw new Error("PAGE_QUERY_UNSUPPORTED");
  }
};
