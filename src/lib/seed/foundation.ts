import { ObjectId, type Document } from "mongodb";
import { createHash } from "node:crypto";
import { z } from "zod";
import { PAGE_SECTION_KINDS } from "../../app/api/pages/page.type.ts";
import { PILLAR_CONTRACT } from "../content/pillars.ts";
import { SeedError } from "./errors.ts";
import type {
  SeedActor,
  SeedManifest,
  SeedRecordDefinition,
  SeedTruthMarker,
} from "./types.ts";

export const FOUNDATION_SEED_VERSION = 3 as const;

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

const objectIdStringSchema = z.string().regex(/^[a-f0-9]{24}$/i);

const foundationObjectId = (seed: string): ObjectId =>
  new ObjectId(
    createHash("sha256")
      .update(`foysalahmedmin-foundation:${seed}`)
      .digest("hex")
      .slice(0, 24)
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
    visual_file: objectIdStringSchema.optional(),
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
            default_og_file: objectIdStringSchema.optional(),
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
                show_metrics: z.literal(true),
                show_testimonials: z.literal(false),
              })
              .strict(),
          })
          .strict(),
        fallbacks: z
          .object({ emergency_visual_key: z.literal("abstract-grid-v1") })
          .strict(),
        process: z
          .array(
            z
              .object({
                key: z.string().min(1).max(64),
                title: z.string().min(1).max(180),
                summary: z.string().min(1).max(500).optional(),
                deliverable: z.string().min(1).max(240).optional(),
                enabled: z.boolean(),
              })
              .strict()
          )
          .max(12),
        metrics: z
          .array(
            z
              .object({
                key: z.string().min(1).max(64),
                label: z.string().min(1).max(80),
                value: z.string().min(1).max(80).optional(),
                verification: z.enum(["unverified", "derived", "verified"]),
                enabled: z.boolean(),
              })
              .strict()
          )
          .max(12),
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
    kind: z.enum(PAGE_SECTION_KINDS),
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

const baseRepeatableSchema = z
  .object({
    contract_version: z.literal(1),
    locale: z.literal("en"),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    title: z.string().min(1).max(160),
    summary: z.string().min(1).max(600).optional(),
    primary_pillar: z
      .enum([
        "frontend",
        "backend",
        "ai_automation",
        "system_design",
        "full_stack",
      ])
      .optional(),
    secondary_pillars: z
      .array(
        z.enum([
          "frontend",
          "backend",
          "ai_automation",
          "system_design",
          "full_stack",
        ])
      )
      .max(4),
    sequence: z.number().int().min(0).max(1_000_000),
    status: z.literal("draft"),
    is_featured: z.boolean(),
    enabled: z.boolean(),
    claim_verification: z.enum([
      "unverified",
      "derived",
      "verified",
      "not_applicable",
    ]),
    version: z.number().int().min(1),
    created_by: objectIdSchema,
    updated_by: objectIdSchema,
    created_at: dateSchema,
    updated_at: dateSchema,
    is_deleted: z.literal(false),
  })
  .passthrough();

const servicePayloadSchema = baseRepeatableSchema.extend({
  outcome: z.string().trim().min(1).max(600),
  capabilities: z.array(z.string()).min(1),
  deliverables: z.array(z.string()),
  technologies: z.array(z.string()),
  icon_key: z.string().optional(),
  visual_file: objectIdSchema.nullable().optional(),
});

const skillGroupPayloadSchema = baseRepeatableSchema.extend({
  description: z.string().trim().min(1).max(1200),
  icon_key: z.string().optional(),
  visual_file: objectIdSchema.nullable().optional(),
});

const skillPayloadSchema = baseRepeatableSchema.extend({
  group: objectIdSchema,
  proficiency_level: z.enum([
    "novice",
    "intermediate",
    "advanced",
    "expert",
    "master",
  ]),
  years_experience: z.number().min(0).max(60).optional(),
  keywords: z.array(z.string()),
  icon_file: objectIdSchema.nullable().optional(),
});

const faqPayloadSchema = baseRepeatableSchema.extend({
  answer: z.string().trim().min(1).max(5000),
  category: z.enum([
    "general",
    "services",
    "process",
    "engagement",
    "technical",
  ]),
  keywords: z.array(z.string()),
  visual_file: objectIdSchema.nullable().optional(),
});

const legalDocumentPayloadSchema = baseRepeatableSchema.extend({
  type: z.enum(["privacy", "terms", "accessibility"]),
  document_version: z.string().regex(/^\d{1,4}\.\d{1,4}(?:\.\d{1,4})?$/),
  effective_at: dateSchema,
  sections: z
    .array(
      z
        .object({
          key: z
            .string()
            .min(1)
            .max(64)
            .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
          heading: z.string().trim().min(1).max(180),
          body: z.string().trim().min(1).max(10000),
        })
        .strict()
    )
    .min(1)
    .max(50),
  reviewed_at: dateSchema.optional(),
  reviewed_by: objectIdSchema.optional(),
  supersedes: objectIdSchema.nullable().optional(),
  document_file: objectIdSchema.nullable().optional(),
});

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
          show_metrics: true,
          show_testimonials: false,
        },
      },
      fallbacks: { emergency_visual_key: "abstract-grid-v1" },
      process: [
        {
          key: "discovery",
          title: "1. Discovery & Analysis",
          summary:
            "Define business goals, target audience, technical constraints, and security requirements.",
          deliverable: "PRD & Threat Model",
          enabled: true,
        },
        {
          key: "design",
          title: "2. System Architecture",
          summary:
            "Choose the technology stack, model the database schemas, and map workflow integrations.",
          deliverable: "RFC Document & Architecture Diagram",
          enabled: true,
        },
        {
          key: "development",
          title: "3. Iterative Engineering",
          summary:
            "Write clean, type-safe code with modular boundaries, thorough tests, and performance profiles.",
          deliverable: "Pull Requests & Test Coverage Reports",
          enabled: true,
        },
        {
          key: "hardening",
          title: "4. Hardening & Security",
          summary:
            "Run static analysis, dependency vulnerability checks, and accessibility validation.",
          deliverable: "Security Audit & Lighthouse Score Reports",
          enabled: true,
        },
        {
          key: "delivery",
          title: "5. Continuous Delivery",
          summary:
            "Configure automated CI/CD pipelines, containerized deployments, and error/log tracking.",
          deliverable: "Production Release & Telemetry Dashboard",
          enabled: true,
        },
        {
          key: "evolution",
          title: "6. Monitoring & Evolution",
          summary:
            "Monitor system health, analyze database query performance, and upgrade library versions.",
          deliverable: "Operational Review & Refactoring Plan",
          enabled: true,
        },
      ],
      metrics: [
        {
          key: "core_disciplines",
          label: "Core disciplines",
          value: "5",
          verification: "derived",
          enabled: true,
        },
        {
          key: "delivery_stages",
          label: "Defined delivery stages",
          value: "6",
          verification: "derived",
          enabled: true,
        },
        {
          key: "guardrail_tracks",
          label: "Guardrail tracks",
          value: "3",
          verification: "derived",
          enabled: true,
        },
      ],
    },
    published: null,
  },
  insert_only: { created_by: actor._id, updated_by: actor._id },
  update_only: { updated_by: actor._id },
  truth: foundationTruth,
  media_bindings: [
    ...PILLAR_CONTRACT.map((pillar, index) => ({
      media_key: `hero.${pillar.key}`,
      field_path: `draft.pillars.${index}.visual_file`,
      required: false,
      purposes: ["hero"] as const,
    })),
    {
      media_key: "site.default-social",
      field_path: "draft.seo.default_og_file",
      required: false,
      purposes: ["social"] as const,
    },
  ],
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
        key: "metrics",
        kind: "metrics-strip",
        visible: true,
        layout: "default",
        source: system,
      },
      {
        key: "pillars",
        kind: "pillar-showcase",
        visible: true,
        layout: "sticky",
        source: system,
      },
      {
        key: "architecture-workflow",
        kind: "architecture-workflow",
        visible: true,
        heading: "Architecture, AI automation, and delivery guardrails",
        layout: "bento",
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
        key: "trust",
        kind: "testimonial-collection",
        visible: true,
        heading: "Trust without invented testimonials",
        layout: "grid",
        item_limit: 3,
        source: automatic({ featured: true }),
      },
      {
        key: "faqs",
        kind: "faq-list",
        visible: true,
        heading: "Practical questions before a project starts",
        layout: "list",
        item_limit: 6,
        source: automatic({ featured: true }),
      },
      {
        key: "process",
        kind: "process-steps",
        visible: true,
        layout: "numbered",
        source: system,
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

const serviceIds = {
  frontend: new ObjectId("507f1f77bcf86cd799439001"),
  backend: new ObjectId("507f1f77bcf86cd799439002"),
  ai_automation: new ObjectId("507f1f77bcf86cd799439003"),
  system_design: new ObjectId("507f1f77bcf86cd799439004"),
  full_stack: new ObjectId("507f1f77bcf86cd799439005"),
};

const skillGroupIds = {
  frontend: new ObjectId("607f1f77bcf86cd799439011"),
  backend: new ObjectId("607f1f77bcf86cd799439012"),
  ai_automation: new ObjectId("607f1f77bcf86cd799439013"),
  system_design: new ObjectId("607f1f77bcf86cd799439014"),
  full_stack: new ObjectId("607f1f77bcf86cd799439015"),
};

const createServiceRecords = (actor: SeedActor): SeedRecordDefinition[] => {
  const services = [
    {
      id: serviceIds.frontend,
      slug: "frontend-engineering",
      title: "Frontend Engineering",
      outcome:
        "Develop keyboard-navigable, accessible, and responsive web interfaces.",
      capabilities: [
        "Accessible UI/UX implementation",
        "State machine workflow logic",
        "Modern responsive styling",
      ],
      technologies: ["React", "Next.js", "TypeScript", "Vanilla CSS"],
      primary_pillar: "frontend" as const,
      sequence: 0,
    },
    {
      id: serviceIds.backend,
      slug: "backend-services",
      title: "Backend Services",
      outcome:
        "Build robust transactional APIs, secure databases, and background queue workers.",
      capabilities: [
        "Transactional API design",
        "Schema migration pipelines",
        "Caching & session layer management",
      ],
      technologies: ["Node.js", "Express", "PostgreSQL", "MongoDB", "Redis"],
      primary_pillar: "backend" as const,
      sequence: 1,
    },
    {
      id: serviceIds.ai_automation,
      slug: "ai-automation",
      title: "AI Integration & Automation",
      outcome:
        "Orchestrate agentic workflows and LLM APIs with human-in-the-loop control.",
      capabilities: [
        "LLM API orchestration",
        "Vector search & RAG workflows",
        "Background agent processing",
      ],
      technologies: ["OpenAI API", "LangChain", "Pinecone", "BullMQ"],
      primary_pillar: "ai_automation" as const,
      sequence: 2,
    },
    {
      id: serviceIds.system_design,
      slug: "system-design",
      title: "Infrastructure & System Design",
      outcome:
        "Architect highly available, secure, and performant cloud infrastructures.",
      capabilities: [
        "Cloud infrastructure provisioning",
        "CI/CD automation pipelines",
        "Query profiling & optimization",
      ],
      technologies: ["AWS", "GCP", "Docker", "GitHub Actions"],
      primary_pillar: "system_design" as const,
      sequence: 3,
    },
    {
      id: serviceIds.full_stack,
      slug: "full-stack-delivery",
      title: "Full-Stack Product Delivery",
      outcome:
        "Deliver end-to-end products from conception to production with automated tests.",
      capabilities: [
        "End-to-end product delivery",
        "Monorepos & development tooling",
        "Production telemetry & monitoring",
      ],
      technologies: ["Next.js", "TypeScript", "Vitest", "Playwright", "pnpm"],
      primary_pillar: "full_stack" as const,
      sequence: 4,
    },
  ];

  return services.map((service) => ({
    stage: "repeatables",
    collection: "services",
    seed_key: `service.${service.slug}`,
    seed_version: FOUNDATION_SEED_VERSION,
    lookup: { slug: service.slug, locale: "en" },
    payload: {
      _id: service.id,
      contract_version: 1,
      locale: "en",
      slug: service.slug,
      title: service.title,
      outcome: service.outcome,
      capabilities: service.capabilities,
      deliverables: [],
      technologies: service.technologies,
      primary_pillar: service.primary_pillar,
      secondary_pillars: [],
      sequence: service.sequence,
      status: "draft" as const,
      is_featured: false,
      enabled: true,
      claim_verification: "not_applicable" as const,
      version: 1,
      is_deleted: false,
    },
    insert_only: { created_by: actor._id, updated_by: actor._id },
    update_only: { updated_by: actor._id },
    truth: foundationTruth,
    validate: (document) => assertSchema(servicePayloadSchema, document),
  }));
};

const createSkillGroupRecords = (actor: SeedActor): SeedRecordDefinition[] => {
  const groups = [
    {
      id: skillGroupIds.frontend,
      slug: "ui-experience",
      title: "User Interface & Experience",
      description:
        "Building responsive, modern, and screen-reader accessible web applications.",
      primary_pillar: "frontend" as const,
      sequence: 0,
    },
    {
      id: skillGroupIds.backend,
      slug: "systems-api",
      title: "Systems & API Engineering",
      description:
        "Developing fast, scalable, and secure backend servers and database structures.",
      primary_pillar: "backend" as const,
      sequence: 1,
    },
    {
      id: skillGroupIds.ai_automation,
      slug: "ai-workflows",
      title: "AI Integration & Workflows",
      description:
        "Wiring agentic tools, vector search, and LLM providers safely.",
      primary_pillar: "ai_automation" as const,
      sequence: 2,
    },
    {
      id: skillGroupIds.system_design,
      slug: "infrastructure-design",
      title: "Infrastructure & Systems Architecture",
      description:
        "Designing cloud topologies, deployment pipelines, and database optimization.",
      primary_pillar: "system_design" as const,
      sequence: 3,
    },
    {
      id: skillGroupIds.full_stack,
      slug: "full-stack-engineering",
      title: "Full-Stack Software Engineering",
      description:
        "Combining end-to-end tooling, clean testing architectures, and deployment stability.",
      primary_pillar: "full_stack" as const,
      sequence: 4,
    },
  ];

  return groups.map((group) => ({
    stage: "repeatables",
    collection: "skill_groups",
    seed_key: `skill_group.${group.slug}`,
    seed_version: FOUNDATION_SEED_VERSION,
    lookup: { slug: group.slug, locale: "en" },
    payload: {
      _id: group.id,
      contract_version: 1,
      locale: "en",
      slug: group.slug,
      title: group.title,
      description: group.description,
      primary_pillar: group.primary_pillar,
      secondary_pillars: [],
      sequence: group.sequence,
      status: "draft" as const,
      is_featured: false,
      enabled: true,
      claim_verification: "not_applicable" as const,
      version: 1,
      is_deleted: false,
    },
    insert_only: { created_by: actor._id, updated_by: actor._id },
    update_only: { updated_by: actor._id },
    truth: foundationTruth,
    validate: (document) => assertSchema(skillGroupPayloadSchema, document),
  }));
};

const createSkillRecords = (actor: SeedActor): SeedRecordDefinition[] => {
  const skills = [
    {
      slug: "nextjs",
      title: "Next.js & React",
      group: skillGroupIds.frontend,
      level: "expert" as const,
      seq: 0,
      p: "frontend" as const,
      kw: ["frontend", "ssr", "react"],
    },
    {
      slug: "typescript",
      title: "TypeScript",
      group: skillGroupIds.frontend,
      level: "expert" as const,
      seq: 1,
      p: "frontend" as const,
      kw: ["type-safety", "javascript"],
    },
    {
      slug: "accessibility",
      title: "Web Accessibility (WCAG)",
      group: skillGroupIds.frontend,
      level: "advanced" as const,
      seq: 2,
      p: "frontend" as const,
      kw: ["a11y", "aria", "screen-readers"],
    },
    {
      slug: "vanillacss",
      title: "Vanilla CSS & Tailwind",
      group: skillGroupIds.frontend,
      level: "advanced" as const,
      seq: 3,
      p: "frontend" as const,
      kw: ["styling", "responsive"],
    },
    {
      slug: "nodejs",
      title: "Node.js & Express",
      group: skillGroupIds.backend,
      level: "expert" as const,
      seq: 0,
      p: "backend" as const,
      kw: ["backend", "runtime", "javascript"],
    },
    {
      slug: "databases",
      title: "SQL & NoSQL Databases",
      group: skillGroupIds.backend,
      level: "expert" as const,
      seq: 1,
      p: "backend" as const,
      kw: ["postgresql", "mongodb", "schema"],
    },
    {
      slug: "redis",
      title: "Redis Caching",
      group: skillGroupIds.backend,
      level: "intermediate" as const,
      seq: 2,
      p: "backend" as const,
      kw: ["caching", "performance"],
    },
    {
      slug: "api-design",
      title: "Secure API Design",
      group: skillGroupIds.backend,
      level: "advanced" as const,
      seq: 3,
      p: "backend" as const,
      kw: ["rest", "graphql", "auth"],
    },
    {
      slug: "openai-api",
      title: "OpenAI API Integration",
      group: skillGroupIds.ai_automation,
      level: "advanced" as const,
      seq: 0,
      p: "ai_automation" as const,
      kw: ["llm", "ai", "openai"],
    },
    {
      slug: "rag-vector",
      title: "RAG & Vector Search",
      group: skillGroupIds.ai_automation,
      level: "intermediate" as const,
      seq: 1,
      p: "ai_automation" as const,
      kw: ["pinecone", "embeddings"],
    },
    {
      slug: "bullmq",
      title: "BullMQ Job Queues",
      group: skillGroupIds.ai_automation,
      level: "advanced" as const,
      seq: 2,
      p: "ai_automation" as const,
      kw: ["queues", "background-jobs"],
    },
    {
      slug: "agentic-flows",
      title: "Agentic Workflows",
      group: skillGroupIds.ai_automation,
      level: "intermediate" as const,
      seq: 3,
      p: "ai_automation" as const,
      kw: ["agents", "automation"],
    },
    {
      slug: "docker",
      title: "Docker Containerization",
      group: skillGroupIds.system_design,
      level: "advanced" as const,
      seq: 0,
      p: "system_design" as const,
      kw: ["containers", "devops"],
    },
    {
      slug: "cloud-services",
      title: "AWS & GCP Cloud",
      group: skillGroupIds.system_design,
      level: "advanced" as const,
      seq: 1,
      p: "system_design" as const,
      kw: ["aws", "gcp", "serverless"],
    },
    {
      slug: "github-actions",
      title: "CI/CD GitHub Actions",
      group: skillGroupIds.system_design,
      level: "advanced" as const,
      seq: 2,
      p: "system_design" as const,
      kw: ["cicd", "automation"],
    },
    {
      slug: "perf-tuning",
      title: "Query Optimization",
      group: skillGroupIds.system_design,
      level: "intermediate" as const,
      seq: 3,
      p: "system_design" as const,
      kw: ["mongodb-indexing", "postgres-profiling"],
    },
    {
      slug: "testing-vitest",
      title: "Vitest & Playwright Testing",
      group: skillGroupIds.full_stack,
      level: "advanced" as const,
      seq: 0,
      p: "full_stack" as const,
      kw: ["testing", "unit", "e2e"],
    },
    {
      slug: "monorepos",
      title: "Monorepos & pnpm Workspaces",
      group: skillGroupIds.full_stack,
      level: "advanced" as const,
      seq: 1,
      p: "full_stack" as const,
      kw: ["tooling", "pnpm", "turborepo"],
    },
    {
      slug: "auth-session",
      title: "Authentication & Cryptography",
      group: skillGroupIds.full_stack,
      level: "advanced" as const,
      seq: 2,
      p: "full_stack" as const,
      kw: ["jwt", "cookies", "security"],
    },
    {
      slug: "observability",
      title: "Telemetry & Observability",
      group: skillGroupIds.full_stack,
      level: "intermediate" as const,
      seq: 3,
      p: "full_stack" as const,
      kw: ["logging", "monitoring"],
    },
  ];

  return skills.map((skill) => {
    const id = foundationObjectId(`skill:${skill.slug}`);
    return {
      stage: "repeatables" as const,
      collection: "skills" as const,
      seed_key: `skill.${skill.slug}`,
      seed_version: FOUNDATION_SEED_VERSION,
      lookup: { slug: skill.slug, locale: "en" },
      payload: {
        _id: id,
        contract_version: 1,
        locale: "en",
        slug: skill.slug,
        title: skill.title,
        primary_pillar: skill.p,
        secondary_pillars: [],
        sequence: skill.seq,
        status: "draft" as const,
        is_featured: false,
        enabled: true,
        claim_verification: "unverified" as const,
        group: skill.group,
        proficiency_level: skill.level,
        years_experience: 3,
        keywords: skill.kw,
        version: 1,
        is_deleted: false,
      },
      insert_only: { created_by: actor._id, updated_by: actor._id },
      update_only: { updated_by: actor._id },
      truth: foundationTruth,
      validate: (document) => assertSchema(skillPayloadSchema, document),
    };
  });
};

const createFAQRecords = (actor: SeedActor): SeedRecordDefinition[] => {
  const faqs = [
    {
      slug: "main-stack",
      title: "What is your main technology stack?",
      answer:
        "My stack centers on TypeScript, Next.js, Node.js, PostgreSQL, MongoDB, and AWS/GCP services.",
      category: "technical" as const,
      keywords: ["stack", "languages", "tools"],
      sequence: 0,
    },
    {
      slug: "remote-work",
      title: "Do you work with remote teams?",
      answer:
        "Yes, I regularly collaborate with remote, distributed teams across multiple time zones.",
      category: "general" as const,
      keywords: ["remote", "collaboration", "team"],
      sequence: 1,
    },
    {
      slug: "application-security",
      title: "How do you ensure application security?",
      answer:
        "I apply robust threat modeling, secure cookie-based auth, static code analysis, and package vulnerability scanning.",
      category: "technical" as const,
      keywords: ["security", "auth", "hardening"],
      sequence: 2,
    },
    {
      slug: "delivery-timeline",
      title: "What is your typical project delivery timeline?",
      answer:
        "Most production-ready products take between 4 to 12 weeks, depending on requirements complexity.",
      category: "process" as const,
      keywords: ["timeline", "delivery", "duration"],
      sequence: 3,
    },
    {
      slug: "post-delivery-support",
      title: "Do you provide post-delivery support?",
      answer:
        "Yes, I offer monthly maintenance agreements for operations, query profiling, and dependency updates.",
      category: "engagement" as const,
      keywords: ["maintenance", "support", "operations"],
      sequence: 4,
    },
    {
      slug: "project-pricing",
      title: "How do you handle project pricing and billing?",
      answer:
        "I structure pricing around defined deliverables and milestones rather than vague hourly billing.",
      category: "engagement" as const,
      keywords: ["pricing", "billing", "contracts"],
      sequence: 5,
    },
  ];

  return faqs.map((faq) => {
    const id = foundationObjectId(`faq:${faq.slug}`);
    return {
      stage: "repeatables" as const,
      collection: "faqs" as const,
      seed_key: `faq.${faq.slug}`,
      seed_version: FOUNDATION_SEED_VERSION,
      lookup: { slug: faq.slug, locale: "en" },
      payload: {
        _id: id,
        contract_version: 1,
        locale: "en",
        slug: faq.slug,
        title: faq.title,
        sequence: faq.sequence,
        status: "draft" as const,
        is_featured: false,
        enabled: true,
        claim_verification: "unverified" as const,
        secondary_pillars: [],
        answer: faq.answer,
        category: faq.category,
        keywords: faq.keywords,
        version: 1,
        is_deleted: false,
      },
      insert_only: { created_by: actor._id, updated_by: actor._id },
      update_only: { updated_by: actor._id },
      truth: foundationTruth,
      validate: (document) => assertSchema(faqPayloadSchema, document),
    };
  });
};

const createLegalDocumentRecords = (
  actor: SeedActor
): SeedRecordDefinition[] => {
  const privacy = {
    slug: "privacy-policy",
    title: "Privacy Policy",
    type: "privacy" as const,
    document_version: "1.0",
    effective_at: new Date("2026-01-01T00:00:00Z"),
    sections: [
      {
        key: "data-collection",
        heading: "1. Data Collection & Purpose",
        body: "We only collect information directly submitted via contact forms to evaluate potential fits.",
      },
      {
        key: "retention-policy",
        heading: "2. Retention & Purge",
        body: "Submitted contact details are retained for up to 180 days after inquiry closure, then permanently deleted.",
      },
    ],
    sequence: 0,
  };

  const terms = {
    slug: "terms-of-service",
    title: "Terms of Service",
    type: "terms" as const,
    document_version: "1.0",
    effective_at: new Date("2026-01-01T00:00:00Z"),
    sections: [
      {
        key: "acceptance-terms",
        heading: "1. Acceptance of Terms",
        body: "By browsing this website, you agree to these standard terms of engagement and review.",
      },
    ],
    sequence: 1,
  };

  return [privacy, terms].map((doc) => {
    const id = foundationObjectId(`legal-document:${doc.slug}`);
    return {
      stage: "repeatables" as const,
      collection: "legal_documents" as const,
      seed_key: `legal_document.${doc.slug}`,
      seed_version: FOUNDATION_SEED_VERSION,
      lookup: { slug: doc.slug, locale: "en" },
      payload: {
        _id: id,
        contract_version: 1,
        locale: "en",
        slug: doc.slug,
        title: doc.title,
        sequence: doc.sequence,
        status: "draft" as const,
        is_featured: false,
        enabled: true,
        claim_verification: "not_applicable" as const,
        secondary_pillars: [],
        type: doc.type,
        document_version: doc.document_version,
        effective_at: doc.effective_at,
        sections: doc.sections,
        version: 1,
        is_deleted: false,
      },
      insert_only: { created_by: actor._id, updated_by: actor._id },
      update_only: { updated_by: actor._id },
      truth: foundationTruth,
      validate: (document) =>
        assertSchema(legalDocumentPayloadSchema, document),
    };
  });
};

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
      purpose: "hero" as const,
      source: {
        kind: "pending_generated" as const,
        requirement: `Non-human editorial visual for the ${pillar.label} hero presentation.`,
      },
      metadata: {
        name: `${pillar.label} hero visual`,
        source: "generated" as const,
      },
    })),
    {
      media_key: "site.default-social",
      purpose: "social" as const,
      source: {
        kind: "pending_generated" as const,
        requirement:
          "Non-human editorial social preview aligned with the five-pillar system.",
      },
      metadata: {
        name: "Default social preview",
        source: "generated" as const,
      },
    },
  ],
  records: [
    ...mediaIntentDefinitions(actor),
    createSiteRecord(actor),
    ...createServiceRecords(actor),
    ...createSkillGroupRecords(actor),
    ...createSkillRecords(actor),
    ...createFAQRecords(actor),
    ...createLegalDocumentRecords(actor),
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
