import { ObjectId, type Document } from "mongodb";
import { z } from "zod";
import { PILLAR_CONTRACT } from "../content/pillars.ts";
import { SeedError } from "./errors.ts";
import type {
  SeedActor,
  SeedManifest,
  SeedRecordDefinition,
  SeedTruthMarker,
} from "./types.ts";

export const FOUNDATION_SEED_VERSION = 1 as const;

const foundationTruth = Object.freeze({
  content_tier: "foundation",
  truth_status: "verified_by_code",
  publication_policy: "draft_only",
  synthetic: false,
} as const satisfies SeedTruthMarker);

const demoTruth = Object.freeze({
  content_tier: "demo",
  truth_status: "verified_by_code",
  publication_policy: "non_production_only",
  synthetic: true,
} as const satisfies SeedTruthMarker);

const objectIdSchema = z.custom<ObjectId>(
  (value) => value instanceof ObjectId,
  "Expected a MongoDB ObjectId"
);

const dateSchema = z.custom<Date>(
  (value) => value instanceof Date && !Number.isNaN(value.getTime()),
  "Expected a valid Date"
);

const siteLinkSchema = z
  .object({
    key: z.string().min(1).max(64),
    label: z.string().min(1).max(80),
    kind: z.literal("internal"),
    href: z.string().regex(/^\/(?!\/)(?!admin(?:\/|$)|api(?:\/|$))/),
    enabled: z.boolean(),
  })
  .strict();

const pillarSchema = z
  .object({
    key: z.enum([
      "frontend",
      "backend",
      "ai_automation",
      "system_design",
      "full_stack",
    ]),
    label: z.string().min(1).max(80),
    order: z.number().int().min(1).max(5),
    enabled: z.literal(false),
    headline: z.string().min(2).max(140),
    summary: z.string().min(2).max(600),
    capabilities: z.array(z.string()).max(12),
    technologies: z.array(z.string()).max(20),
    icon_key: z.enum([
      "code-window",
      "server-stack",
      "automation-node",
      "system-blueprint",
      "full-stack-layers",
    ]),
    accent: z.enum(["cyan", "blue", "violet", "amber", "emerald"]),
    fallback_visual_key: z.string().min(1).max(64),
  })
  .strict();

const sitePayloadSchema = z
  .object({
    site_key: z.literal("primary"),
    schema_version: z.literal(1),
    contract_version: z.literal(1),
    revision: z.literal(1),
    draft: z
      .object({
        identity: z
          .object({
            locale: z.literal("en"),
            timezone: z.literal("Asia/Dhaka"),
          })
          .strict(),
        positioning: z
          .object({
            canonical: z.string().min(2).max(240),
          })
          .strict(),
        pillars: z.array(pillarSchema).length(5),
        brand: z.object({}).strict(),
        contact: z
          .object({
            email_visibility: z.literal("hidden"),
            phone_visibility: z.literal("hidden"),
            availability: z.literal("unknown"),
            map_policy: z.literal("hidden"),
          })
          .strict(),
        navigation: z
          .object({
            header: z.array(siteLinkSchema).max(12),
            footer: z.array(siteLinkSchema).max(16),
            legal: z.array(siteLinkSchema).max(8),
          })
          .strict(),
        social_links: z.array(z.never()).length(0),
        primary_ctas: z.array(siteLinkSchema).max(4),
        footer: z.object({ tagline: z.string().min(2).max(240) }).strict(),
        seo: z
          .object({
            default_title: z.string().min(2).max(120),
            default_description: z.string().min(2).max(320),
            allow_indexing: z.literal(false),
          })
          .strict(),
        experience: z
          .object({
            theme: z.literal("system"),
            motion: z.literal("reduced"),
            accent: z.literal("cyan"),
            feature_flags: z
              .object({
                show_availability: z.literal(false),
                show_metrics: z.literal(false),
                show_testimonials: z.literal(false),
              })
              .strict(),
          })
          .strict(),
        fallbacks: z
          .object({ emergency_visual_key: z.literal("abstract-grid-v1") })
          .strict(),
        metrics: z.array(z.never()).length(0),
      })
      .strict(),
    published: z.null(),
    created_by: objectIdSchema,
    updated_by: objectIdSchema,
    created_at: dateSchema,
    updated_at: dateSchema,
  })
  .passthrough()
  .superRefine((site, context) => {
    for (const [index, contract] of PILLAR_CONTRACT.entries()) {
      const pillar = site.draft.pillars[index];
      if (
        pillar.key !== contract.key ||
        pillar.label !== contract.label ||
        pillar.order !== contract.order ||
        pillar.icon_key !== contract.default_icon_key ||
        pillar.accent !== contract.default_accent ||
        pillar.fallback_visual_key !== contract.fallback_visual_key
      ) {
        context.addIssue({
          code: "custom",
          path: ["draft", "pillars", index],
          message: "Pillar presentation must match the canonical contract",
        });
      }
    }
  });

const mediaIntentSchema = z
  .object({
    media_key: z.string().min(1).max(120),
    contract_version: z.literal(1),
    purpose: z.enum(["hero", "social"]),
    required_for: z.string().min(1).max(160),
    source_policy: z.literal("managed_media_only"),
    state: z.literal("awaiting_source"),
    source_sha256: z.null(),
    file_id: z.null(),
    content_tier: z.literal("foundation"),
    truth_status: z.literal("verified_by_code"),
    publication_policy: z.literal("draft_only"),
    synthetic: z.literal(false),
    created_by: objectIdSchema,
    updated_by: objectIdSchema,
    created_at: dateSchema,
    updated_at: dateSchema,
  })
  .passthrough();

const pageSectionSchema = z
  .object({
    key: z.string().regex(/^[a-z][a-z0-9-]*$/),
    kind: z.enum([
      "site-hero",
      "site-introduction",
      "project-collection",
      "article-collection",
      "service-collection",
      "skill-group-collection",
      "timeline",
      "credential-collection",
      "faq-list",
      "legal-document",
      "contact-form",
      "contact-cta",
    ]),
    visible: z.boolean(),
    heading: z.string().min(1).max(100).optional(),
    layout: z.string().min(1).max(32),
    item_limit: z.number().int().min(1).max(24).optional(),
    source: z.union([
      z.object({ mode: z.literal("system") }).strict(),
      z
        .object({
          mode: z.literal("automatic"),
          filter: z.record(
            z.string(),
            z.union([z.string(), z.boolean(), z.number()])
          ),
        })
        .strict(),
    ]),
  })
  .strict();

const pageDocumentSchema = z
  .object({
    route_key: z.enum([
      "home",
      "about",
      "projects",
      "articles",
      "contact",
      "privacy",
      "terms",
    ]),
    locale: z.literal("en"),
    schema_version: z.literal(1),
    contract_version: z.literal(1),
    revision: z.literal(1),
    draft: z
      .object({
        seo: z.object({ noindex: z.literal(true) }).strict(),
        sections: z.array(pageSectionSchema).min(1).max(20),
      })
      .strict(),
    published: z.null(),
    created_by: objectIdSchema,
    updated_by: objectIdSchema,
    created_at: dateSchema,
    updated_at: dateSchema,
  })
  .passthrough();

const assertSchema = (schema: z.ZodType, value: Readonly<Document>): void => {
  const parsed = schema.safeParse(value);
  if (!parsed.success) {
    throw new SeedError(
      "SEED_MANIFEST_INVALID",
      "A foundation target failed its versioned seed schema.",
      parsed.error.issues.map((issue) => issue.path.join("."))
    );
  }
};

const internalLink = (key: string, label: string, href: string) => ({
  key,
  label,
  kind: "internal" as const,
  href,
  enabled: true,
});

const createSiteRecord = (actor: SeedActor): SeedRecordDefinition => ({
  stage: "site",
  collection: "sites",
  seed_key: "site.primary",
  seed_version: FOUNDATION_SEED_VERSION,
  lookup: { site_key: "primary" },
  payload: {
    site_key: "primary",
    schema_version: 1,
    contract_version: 1,
    revision: 1,
    draft: {
      identity: { locale: "en", timezone: "Asia/Dhaka" },
      positioning: {
        canonical: PILLAR_CONTRACT.map((pillar) => pillar.label).join(" · "),
      },
      pillars: PILLAR_CONTRACT.map((pillar) => ({
        key: pillar.key,
        label: pillar.label,
        order: pillar.order,
        enabled: false,
        headline: pillar.label,
        summary:
          "Evidence-backed work for this pillar remains unavailable until editorial verification is complete.",
        capabilities: [],
        technologies: [],
        icon_key: pillar.default_icon_key,
        accent: pillar.default_accent,
        fallback_visual_key: pillar.fallback_visual_key,
      })),
      brand: {},
      contact: {
        email_visibility: "hidden",
        phone_visibility: "hidden",
        availability: "unknown",
        map_policy: "hidden",
      },
      navigation: {
        header: [
          internalLink("home", "Home", "/"),
          internalLink("about", "About", "/about"),
          internalLink("projects", "Projects", "/projects"),
          internalLink("articles", "Articles", "/articles"),
          internalLink("contact", "Contact", "/contact"),
        ],
        footer: [
          internalLink("home", "Home", "/"),
          internalLink("projects", "Projects", "/projects"),
          internalLink("articles", "Articles", "/articles"),
          internalLink("contact", "Contact", "/contact"),
        ],
        legal: [
          internalLink("privacy", "Privacy", "/privacy"),
          internalLink("terms", "Terms", "/terms"),
        ],
      },
      social_links: [],
      primary_ctas: [
        internalLink("contact", "Start a conversation", "/contact"),
      ],
      footer: {
        tagline: PILLAR_CONTRACT.map((pillar) => pillar.label).join(" · "),
      },
      seo: {
        default_title: "Engineering Portfolio",
        default_description:
          "A five-pillar engineering portfolio with evidence-gated content.",
        allow_indexing: false,
      },
      experience: {
        theme: "system",
        motion: "reduced",
        accent: "cyan",
        feature_flags: {
          show_availability: false,
          show_metrics: false,
          show_testimonials: false,
        },
      },
      fallbacks: { emergency_visual_key: "abstract-grid-v1" },
      metrics: [],
    },
    published: null,
  },
  insert_only: { created_by: actor._id, updated_by: actor._id },
  update_only: { updated_by: actor._id },
  truth: foundationTruth,
  validate: (document) => assertSchema(sitePayloadSchema, document),
});

const mediaIntentDefinitions = (actor: SeedActor): SeedRecordDefinition[] => {
  const intents = [
    ...PILLAR_CONTRACT.map((pillar) => ({
      media_key: `hero.${pillar.key}`,
      purpose: "hero" as const,
      required_for: `site.pillars.${pillar.key}.visual_file`,
    })),
    {
      media_key: "site.default-social",
      purpose: "social" as const,
      required_for: "site.seo.default_og_file",
    },
  ];
  return intents.map((intent) => ({
    stage: "media",
    collection: "seed_media_intents",
    seed_key: `media.${intent.media_key}`,
    seed_version: FOUNDATION_SEED_VERSION,
    lookup: { media_key: intent.media_key },
    payload: {
      media_key: intent.media_key,
      contract_version: 1,
      purpose: intent.purpose,
      required_for: intent.required_for,
      source_policy: "managed_media_only",
      state: "awaiting_source",
      source_sha256: null,
      file_id: null,
      content_tier: "foundation",
      truth_status: "verified_by_code",
      publication_policy: "draft_only",
      synthetic: false,
    },
    insert_only: { created_by: actor._id, updated_by: actor._id },
    update_only: { updated_by: actor._id },
    truth: foundationTruth,
    validate: (document) => assertSchema(mediaIntentSchema, document),
  }));
};

const automatic = (
  filter: Readonly<Record<string, string | boolean>> = {}
) => ({
  mode: "automatic" as const,
  filter,
});

const system = { mode: "system" as const };

const pageDrafts = {
  home: {
    seo: { noindex: true },
    sections: [
      {
        key: "hero",
        kind: "site-hero",
        visible: true,
        layout: "immersive",
        source: system,
      },
      {
        key: "services",
        kind: "service-collection",
        visible: true,
        layout: "cards",
        item_limit: 5,
        source: automatic({ featured: true }),
      },
      {
        key: "skills",
        kind: "skill-group-collection",
        visible: true,
        layout: "matrix",
        item_limit: 5,
        source: automatic({ featured: true }),
      },
      {
        key: "projects",
        kind: "project-collection",
        visible: true,
        layout: "featured",
        item_limit: 6,
        source: automatic({ featured: true }),
      },
      {
        key: "articles",
        kind: "article-collection",
        visible: true,
        layout: "featured",
        item_limit: 6,
        source: automatic({ featured: true }),
      },
      {
        key: "contact",
        kind: "contact-cta",
        visible: true,
        layout: "banner",
        source: system,
      },
    ],
  },
  about: {
    seo: { noindex: true },
    sections: [
      {
        key: "introduction",
        kind: "site-introduction",
        visible: true,
        layout: "split",
        source: system,
      },
      {
        key: "skills",
        kind: "skill-group-collection",
        visible: true,
        layout: "matrix",
        item_limit: 5,
        source: automatic(),
      },
      {
        key: "timeline",
        kind: "timeline",
        visible: true,
        layout: "timeline",
        item_limit: 12,
        source: automatic(),
      },
      {
        key: "credentials",
        kind: "credential-collection",
        visible: true,
        layout: "compact",
        item_limit: 12,
        source: automatic(),
      },
      {
        key: "faqs",
        kind: "faq-list",
        visible: true,
        layout: "accordion",
        item_limit: 8,
        source: automatic(),
      },
      {
        key: "contact",
        kind: "contact-cta",
        visible: true,
        layout: "banner",
        source: system,
      },
    ],
  },
  projects: {
    seo: { noindex: true },
    sections: [
      {
        key: "projects",
        kind: "project-collection",
        visible: true,
        layout: "grid",
        item_limit: 12,
        source: automatic(),
      },
      {
        key: "contact",
        kind: "contact-cta",
        visible: true,
        layout: "banner",
        source: system,
      },
    ],
  },
  articles: {
    seo: { noindex: true },
    sections: [
      {
        key: "articles",
        kind: "article-collection",
        visible: true,
        layout: "grid",
        item_limit: 12,
        source: automatic(),
      },
      {
        key: "contact",
        kind: "contact-cta",
        visible: true,
        layout: "banner",
        source: system,
      },
    ],
  },
  contact: {
    seo: { noindex: true },
    sections: [
      {
        key: "contact",
        kind: "contact-form",
        visible: true,
        layout: "split",
        source: system,
      },
      {
        key: "faqs",
        kind: "faq-list",
        visible: true,
        layout: "accordion",
        item_limit: 8,
        source: automatic({ category: "engagement" }),
      },
    ],
  },
  privacy: {
    seo: { noindex: true },
    sections: [
      {
        key: "privacy",
        kind: "legal-document",
        visible: true,
        layout: "document",
        item_limit: 1,
        source: automatic({ type: "privacy" }),
      },
    ],
  },
  terms: {
    seo: { noindex: true },
    sections: [
      {
        key: "terms",
        kind: "legal-document",
        visible: true,
        layout: "document",
        item_limit: 1,
        source: automatic({ type: "terms" }),
      },
    ],
  },
} as const;

const createPageRecords = (actor: SeedActor): SeedRecordDefinition[] =>
  Object.entries(pageDrafts).map(([routeKey, draft]) => ({
    stage: "pages",
    collection: "pages",
    seed_key: `page.${routeKey}`,
    seed_version: FOUNDATION_SEED_VERSION,
    lookup: { route_key: routeKey, locale: "en" },
    payload: {
      route_key: routeKey,
      locale: "en",
      schema_version: 1,
      contract_version: 1,
      revision: 1,
      draft,
      published: null,
    },
    insert_only: { created_by: actor._id, updated_by: actor._id },
    update_only: { updated_by: actor._id },
    truth: foundationTruth,
    validate: (document) => assertSchema(pageDocumentSchema, document),
  }));

export const createFoundationSeedManifest = (
  actor: SeedActor
): SeedManifest => ({
  manifest_key: "portfolio-foundation",
  seed_version: FOUNDATION_SEED_VERSION,
  mode: "foundation",
  description:
    "Draft-only five-pillar Site, managed-media intents, navigation, fallback policy, and fixed Page composition.",
  truth: foundationTruth,
  media: [
    ...PILLAR_CONTRACT.map((pillar) => ({
      media_key: `hero.${pillar.key}`,
      purpose: "hero",
      source: {
        kind: "pending_generated" as const,
        requirement: `Non-human editorial visual for the ${pillar.label} hero presentation.`,
      },
      metadata: {
        name: `${pillar.label} hero visual`,
        source: "generated" as const,
        provenance_key: `foundation.hero.${pillar.key}.v1`,
      },
    })),
    {
      media_key: "site.default-social",
      purpose: "social",
      source: {
        kind: "pending_generated",
        requirement:
          "Non-human editorial social preview aligned with the five-pillar system.",
      },
      metadata: {
        name: "Default social preview",
        source: "generated",
        provenance_key: "foundation.social.default.v1",
      },
    },
  ],
  records: [
    ...mediaIntentDefinitions(actor),
    createSiteRecord(actor),
    ...createPageRecords(actor),
  ],
});

export const createDemoSeedManifest = (): SeedManifest => ({
  manifest_key: "portfolio-demo-fixtures",
  seed_version: 1,
  mode: "demo",
  description:
    "Reserved, non-production-only demo seed manifest; P09.3 may add visibly synthetic unpublished fixtures in a later version.",
  truth: demoTruth,
  media: [],
  records: [],
});
