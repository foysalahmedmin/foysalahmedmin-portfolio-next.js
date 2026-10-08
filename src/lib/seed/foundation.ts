import { ObjectId, type Document } from "mongodb";
import { createHash } from "node:crypto";
import { z } from "zod";
import {
  PAGE_ROUTE_KEYS,
  PAGE_SECTION_KINDS,
  type TPageRouteKey,
} from "../../app/api/pages/page.type.ts";
import {
  PILLAR_ACCENTS,
  PILLAR_CONTRACT,
  PILLAR_ICON_KEYS,
  PILLAR_KEYS,
  pillarKeySchema,
} from "../content/pillars.ts";
import { SeedError } from "./errors.ts";
import type {
  SeedActor,
  SeedManifest,
  SeedRecordDefinition,
  SeedTruthMarker,
} from "./types.ts";

export const FOUNDATION_SEED_VERSION = 7 as const;

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
    key: pillarKeySchema,
    label: z.string().min(1).max(80),
    order: z.number().int().min(1).max(PILLAR_CONTRACT.length),
    enabled: z.literal(false),
    headline: z.string().min(2).max(140),
    summary: z.string().min(2).max(600),
    capabilities: z.array(z.string()).max(12),
    technologies: z.array(z.string()).max(20),
    icon_key: z.enum(PILLAR_ICON_KEYS),
    accent: z.enum(PILLAR_ACCENTS),
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
            compact: z.string().min(2).max(160),
            mobile: z.string().min(2).max(120),
            long: z.string().min(2).max(500),
            client_promise: z.string().min(2).max(400),
          })
          .strict(),
        pillars: z.array(pillarSchema).length(PILLAR_CONTRACT.length),
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
    route_key: z.enum(PAGE_ROUTE_KEYS),
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
    primary_pillar: pillarKeySchema.optional(),
    secondary_pillars: z.array(pillarKeySchema).max(PILLAR_KEYS.length - 1),
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

const demoCategorySchema = z
  .object({
    _id: objectIdSchema,
    name: z.string().min(2).max(50),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    description: z.string().min(1).max(500),
    sequence: z.number().int().min(1).max(100),
    status: z.literal("active"),
    is_deleted: z.literal(false),
    created_by: objectIdSchema,
    updated_by: objectIdSchema,
    created_at: dateSchema,
    updated_at: dateSchema,
  })
  .strict();

const demoContentBase = {
  _id: objectIdSchema,
  name: z.string().min(2).max(160).startsWith("Demo"),
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  content: z.string().min(1),
  category: objectIdSchema,
  author: objectIdSchema,
  primary_pillar: pillarKeySchema,
  secondary_pillars: z.array(pillarKeySchema).max(PILLAR_KEYS.length - 1),
  is_featured: z.boolean(),
  is_deleted: z.literal(false),
  created_by: objectIdSchema,
  updated_by: objectIdSchema,
  created_at: dateSchema,
  updated_at: dateSchema,
};

const demoProjectSchema = z
  .object({
    ...demoContentBase,
    description: z.string().min(1).max(300),
    problem: z.string().min(1).max(5000),
    role: z.string().min(1).max(1000),
    constraints: z.array(z.string()).max(12),
    decisions: z.array(z.string()).max(12),
    learnings: z.array(z.string()).max(12),
    tags: z.array(z.string()).max(12),
    delivery_status: z.string().min(1),
    publication_status: z.literal("draft"),
    project_type: z.string().min(1),
    sequence: z.number().int().min(1),
  })
  .strict();

const demoArticleSchema = z
  .object({
    ...demoContentBase,
    excerpt: z.string().min(1).max(500),
    topics: z.array(z.string()).max(12),
    status: z.literal("draft"),
    is_premium: z.literal(false),
    reading_time_minutes: z.number().int().min(1).max(600),
    reading_time_source: z.literal("manual"),
  })
  .strict();

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

// Role copy is written from the client's side: the problem taken off their
// plate first, the tools second. It stays a draft until the owner publishes it.
const PILLAR_COPY: Record<
  (typeof PILLAR_KEYS)[number],
  Readonly<{
    headline: string;
    summary: string;
    capabilities: readonly string[];
    technologies: readonly string[];
  }>
> = {
  system_architect: {
    headline: "Get the design right before it gets expensive",
    summary:
      "I turn unclear requirements and growing complexity into an architecture that is secure, scalable, and affordable to run, with every trade-off explained in plain language.",
    capabilities: [
      "Architecture and technical decision records",
      "Database and data-model design",
      "Cloud, CI/CD, and release strategy",
      "Security, reliability, and cost reviews",
    ],
    technologies: [
      "MongoDB",
      "PostgreSQL",
      "Redis",
      "Docker",
      "GitHub Actions",
      "Vercel",
    ],
  },
  software_developer: {
    headline: "Turn the idea into a product people can use",
    summary:
      "I build fast, accessible web products end to end (interface, API, and data) and deliver code your team can read, test, and extend.",
    capabilities: [
      "Web applications and dashboards",
      "APIs, authentication, and data layers",
      "Admin panels and internal tools",
      "Testing, accessibility, and performance",
    ],
    technologies: [
      "Next.js",
      "React",
      "TypeScript",
      "Node.js",
      "Express",
      "MongoDB",
      "Tailwind CSS",
    ],
  },
  ai_automation: {
    headline: "Hand repetitive work to automation you can trust",
    summary:
      "I find the manual, error-prone steps in a workflow and replace them with automation that is monitored, reviewable, and easy to switch off.",
    capabilities: [
      "Workflow and integration automation",
      "LLM-assisted features with human review",
      "Background jobs and data pipelines",
      "Monitoring, logging, and safe fallbacks",
    ],
    technologies: [
      "Node.js",
      "TypeScript",
      "Python",
      "Redis",
      "RabbitMQ",
      "LLM APIs",
    ],
  },
};

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
        compact:
          "I turn business problems into clear architectures, working software, and dependable automation.",
        mobile:
          "Business problems, solved with architecture, software, and automation.",
        long: "Start with the problem, not the technology. I work with founders and teams to understand what is slowing the business down, then design, build, and automate the simplest solution that fixes it, explaining every trade-off in plain language along the way.",
        client_promise:
          "Bring me the problem. You will get a clear plan, working software in small reviewable steps, and honest advice on what is not worth building.",
      },
      pillars: PILLAR_CONTRACT.map((pillar) => ({
        key: pillar.key,
        label: pillar.label,
        order: pillar.order,
        enabled: false,
        headline: PILLAR_COPY[pillar.key].headline,
        summary: PILLAR_COPY[pillar.key].summary,
        capabilities: [...PILLAR_COPY[pillar.key].capabilities],
        technologies: [...PILLAR_COPY[pillar.key].technologies],
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
          internalLink("case-studies", "Case studies", "/case-studies"),
          internalLink("articles", "Articles", "/articles"),
          internalLink("videos", "Videos", "/videos"),
          internalLink("contact", "Contact", "/contact"),
        ],
        footer: [
          internalLink("home", "Home", "/"),
          internalLink("projects", "Projects", "/projects"),
          internalLink("case-studies", "Case studies", "/case-studies"),
          internalLink("articles", "Articles", "/articles"),
          internalLink("videos", "Videos", "/videos"),
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
          "A solutions-focused portfolio: system architecture, software development, and AI automation that solve real business problems.",
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
          title: "1. Understand the problem",
          summary:
            "Start from the business goal, the people affected, and the constraint that hurts most, before choosing any technology.",
          deliverable: "Problem brief and success measures",
          enabled: true,
        },
        {
          key: "design",
          title: "2. Shape the solution",
          summary:
            "Compare realistic options, pick the simplest one that works, and write down why.",
          deliverable: "Solution outline and decision record",
          enabled: true,
        },
        {
          key: "development",
          title: "3. Build in small steps",
          summary:
            "Ship working increments you can review early, instead of one big reveal at the end.",
          deliverable: "Reviewable releases and automated tests",
          enabled: true,
        },
        {
          key: "hardening",
          title: "4. Make it dependable",
          summary:
            "Check security, accessibility, and performance so the solution holds up under real use.",
          deliverable: "Quality and security review notes",
          enabled: true,
        },
        {
          key: "delivery",
          title: "5. Launch and hand over",
          summary:
            "Release through automated pipelines with monitoring in place, and hand over documentation your team can run with.",
          deliverable: "Production release and handover notes",
          enabled: true,
        },
        {
          key: "evolution",
          title: "6. Measure and improve",
          summary:
            "Watch the numbers that mattered at the start and keep improving what moves them.",
          deliverable: "Outcome review and next-step plan",
          enabled: true,
        },
      ],
      metrics: [
        {
          key: "core_roles",
          label: "Core roles",
          value: String(PILLAR_CONTRACT.length),
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
        heading: "Three ways I help you move forward",
        layout: "sticky",
        source: system,
      },
      {
        key: "architecture-workflow",
        kind: "architecture-workflow",
        visible: true,
        heading: "How every solution stays reliable, reviewable, and safe",
        layout: "bento",
        source: system,
      },
      {
        key: "services",
        kind: "service-collection",
        visible: true,
        heading: "How I can help",
        layout: "cards",
        item_limit: PILLAR_CONTRACT.length,
        source: automatic({ featured: true }),
      },
      {
        key: "skills",
        kind: "skill-group-collection",
        visible: true,
        heading: "The toolkit behind the solutions",
        layout: "matrix",
        item_limit: PILLAR_CONTRACT.length,
        source: automatic({ featured: true }),
      },
      {
        key: "projects",
        kind: "project-collection",
        visible: true,
        heading: "Problems solved",
        layout: "featured",
        item_limit: 6,
        source: automatic({ featured: true }),
      },
      {
        key: "case-studies",
        kind: "case-study-collection",
        visible: true,
        heading: "Problems solved, start to finish",
        layout: "featured",
        item_limit: 3,
        source: automatic({ featured: true }),
      },
      {
        key: "videos",
        kind: "video-collection",
        visible: true,
        heading: "See the thinking behind the work",
        layout: "grid",
        item_limit: 3,
        source: automatic({ aspect_ratio: "landscape" }),
      },
      {
        key: "reels",
        kind: "video-collection",
        visible: true,
        heading: "Short clips, straight to the point",
        layout: "grid",
        item_limit: 4,
        source: automatic({ aspect_ratio: "reel" }),
      },
      {
        key: "articles",
        kind: "article-collection",
        visible: true,
        heading: "Notes on solving real problems",
        layout: "featured",
        item_limit: 6,
        source: automatic({ featured: true }),
      },
      {
        key: "github",
        kind: "github-profile",
        visible: true,
        heading: "See how I build, in the open",
        layout: "default",
        source: system,
      },
      {
        key: "trust",
        kind: "testimonial-collection",
        visible: true,
        heading: "What clients say",
        layout: "grid",
        item_limit: 3,
        source: automatic({ featured: true }),
      },
      {
        key: "faqs",
        kind: "faq-list",
        visible: true,
        heading: "Questions before we start",
        layout: "list",
        item_limit: 6,
        source: automatic({ featured: true }),
      },
      {
        key: "process",
        kind: "process-steps",
        visible: true,
        heading: "How we work together",
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
        item_limit: PILLAR_CONTRACT.length,
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
  "case-studies": {
    seo: { noindex: true },
    sections: [
      {
        key: "case-studies",
        kind: "case-study-collection",
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
  videos: {
    seo: { noindex: true },
    sections: [
      {
        key: "videos",
        kind: "video-collection",
        visible: true,
        layout: "grid",
        item_limit: 24,
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
  system_architect: new ObjectId("507f1f77bcf86cd799439001"),
  software_developer: new ObjectId("507f1f77bcf86cd799439002"),
  ai_automation: new ObjectId("507f1f77bcf86cd799439003"),
};

const skillGroupIds = {
  system_architect: new ObjectId("607f1f77bcf86cd799439011"),
  software_developer: new ObjectId("607f1f77bcf86cd799439012"),
  ai_automation: new ObjectId("607f1f77bcf86cd799439013"),
};

const createServiceRecords = (actor: SeedActor): SeedRecordDefinition[] => {
  const services = [
    {
      id: serviceIds.system_architect,
      slug: "architecture-system-design",
      title: "Architecture & System Design",
      outcome:
        "A clear technical blueprint that reduces risk, rework, and running cost before the build begins.",
      capabilities: [
        "Architecture and technical decision records",
        "Database and data-model design",
        "Cloud, CI/CD, and release strategy",
        "Security, reliability, and cost reviews",
      ],
      deliverables: [
        "Solution architecture overview",
        "Decision record with trade-offs",
        "Delivery roadmap with milestones",
      ],
      technologies: [
        "MongoDB",
        "PostgreSQL",
        "Redis",
        "Docker",
        "GitHub Actions",
      ],
      primary_pillar: "system_architect" as const,
      sequence: 0,
    },
    {
      id: serviceIds.software_developer,
      slug: "product-software-development",
      title: "Product & Software Development",
      outcome:
        "A working, maintainable product (interface, API, and data) delivered in small steps you can review.",
      capabilities: [
        "Web applications and dashboards",
        "APIs, authentication, and data layers",
        "Admin panels and internal tools",
        "Testing, accessibility, and performance",
      ],
      deliverables: [
        "Working software in reviewable releases",
        "Automated tests for the critical flows",
        "Handover documentation for your team",
      ],
      technologies: ["Next.js", "React", "TypeScript", "Node.js", "MongoDB"],
      primary_pillar: "software_developer" as const,
      sequence: 1,
    },
    {
      id: serviceIds.ai_automation,
      slug: "ai-workflow-automation",
      title: "AI & Workflow Automation",
      outcome:
        "Repetitive manual work replaced by automation your team can trust, audit, and switch off.",
      capabilities: [
        "Workflow and integration automation",
        "LLM-assisted features with human review",
        "Background jobs and data pipelines",
        "Monitoring, logging, and safe fallbacks",
      ],
      deliverables: [
        "Automated workflow running in production",
        "Monitoring and failure alerts",
        "Runbook for your team",
      ],
      technologies: ["Node.js", "TypeScript", "Python", "Redis", "RabbitMQ"],
      primary_pillar: "ai_automation" as const,
      sequence: 2,
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
      deliverables: service.deliverables,
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
      id: skillGroupIds.system_architect,
      slug: "architecture-infrastructure",
      title: "Architecture & Infrastructure",
      description:
        "The decisions that keep a product secure, scalable, and affordable to run.",
      primary_pillar: "system_architect" as const,
      sequence: 0,
    },
    {
      id: skillGroupIds.software_developer,
      slug: "product-engineering",
      title: "Product Engineering",
      description:
        "Building the interface, the API, and the data layer of products people rely on.",
      primary_pillar: "software_developer" as const,
      sequence: 1,
    },
    {
      id: skillGroupIds.ai_automation,
      slug: "ai-workflows",
      title: "AI & Workflow Automation",
      description:
        "Removing repetitive work with automation that stays observable and under human control.",
      primary_pillar: "ai_automation" as const,
      sequence: 2,
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
      slug: "system-architecture",
      title: "System & Solution Architecture",
      group: skillGroupIds.system_architect,
      level: "advanced" as const,
      seq: 0,
      p: "system_architect" as const,
      kw: ["architecture", "trade-offs", "decision-records"],
    },
    {
      slug: "data-modeling",
      title: "Database & Data Modeling",
      group: skillGroupIds.system_architect,
      level: "advanced" as const,
      seq: 1,
      p: "system_architect" as const,
      kw: ["mongodb", "postgresql", "schema"],
    },
    {
      slug: "caching-messaging",
      title: "Caching & Messaging",
      group: skillGroupIds.system_architect,
      level: "intermediate" as const,
      seq: 2,
      p: "system_architect" as const,
      kw: ["redis", "rabbitmq", "kafka"],
    },
    {
      slug: "security-by-design",
      title: "Security by Design",
      group: skillGroupIds.system_architect,
      level: "advanced" as const,
      seq: 3,
      p: "system_architect" as const,
      kw: ["authentication", "sessions", "threat-modeling"],
    },
    {
      slug: "ci-cd-deployment",
      title: "CI/CD & Deployment",
      group: skillGroupIds.system_architect,
      level: "intermediate" as const,
      seq: 4,
      p: "system_architect" as const,
      kw: ["github-actions", "docker", "vercel"],
    },
    {
      slug: "nextjs-react",
      title: "Next.js & React",
      group: skillGroupIds.software_developer,
      level: "advanced" as const,
      seq: 0,
      p: "software_developer" as const,
      kw: ["nextjs", "react", "ssr"],
    },
    {
      slug: "typescript",
      title: "TypeScript & JavaScript",
      group: skillGroupIds.software_developer,
      level: "advanced" as const,
      seq: 1,
      p: "software_developer" as const,
      kw: ["typescript", "javascript", "type-safety"],
    },
    {
      slug: "nodejs-apis",
      title: "Node.js & Express APIs",
      group: skillGroupIds.software_developer,
      level: "advanced" as const,
      seq: 2,
      p: "software_developer" as const,
      kw: ["nodejs", "express", "rest"],
    },
    {
      slug: "mongodb-mongoose",
      title: "MongoDB & Mongoose",
      group: skillGroupIds.software_developer,
      level: "advanced" as const,
      seq: 3,
      p: "software_developer" as const,
      kw: ["mongodb", "mongoose", "prisma"],
    },
    {
      slug: "accessible-ui",
      title: "Accessible, Responsive UI",
      group: skillGroupIds.software_developer,
      level: "advanced" as const,
      seq: 4,
      p: "software_developer" as const,
      kw: ["tailwind", "accessibility", "responsive"],
    },
    {
      slug: "workflow-automation",
      title: "Workflow Automation",
      group: skillGroupIds.ai_automation,
      level: "intermediate" as const,
      seq: 0,
      p: "ai_automation" as const,
      kw: ["workflows", "integrations", "automation"],
    },
    {
      slug: "llm-integration",
      title: "LLM Integration",
      group: skillGroupIds.ai_automation,
      level: "intermediate" as const,
      seq: 1,
      p: "ai_automation" as const,
      kw: ["llm", "prompting", "apis"],
    },
    {
      slug: "background-jobs",
      title: "Background Jobs & Queues",
      group: skillGroupIds.ai_automation,
      level: "intermediate" as const,
      seq: 2,
      p: "ai_automation" as const,
      kw: ["queues", "rabbitmq", "jobs"],
    },
    {
      slug: "python-automation",
      title: "Python for Automation",
      group: skillGroupIds.ai_automation,
      level: "novice" as const,
      seq: 3,
      p: "ai_automation" as const,
      kw: ["python", "scripting", "data"],
    },
    {
      slug: "human-in-the-loop",
      title: "Human-in-the-Loop Review",
      group: skillGroupIds.ai_automation,
      level: "intermediate" as const,
      seq: 4,
      p: "ai_automation" as const,
      kw: ["review", "validation", "guardrails"],
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
      slug: "problems-i-solve",
      title: "What kinds of problems can you help with?",
      answer:
        "Usually one of three: a system whose design is unclear or fragile, a product that needs to be built or rescued, or repetitive manual work that automation could take over. If your problem is something else, describe it and I will tell you honestly whether I can help.",
      category: "services" as const,
      keywords: ["problems", "services", "fit"],
      sequence: 0,
    },
    {
      slug: "getting-started",
      title: "How does a project start?",
      answer:
        "With a short conversation about the problem, the people affected, and what success looks like. From that I propose a simple plan with milestones, so you know what happens next before you commit to anything.",
      category: "process" as const,
      keywords: ["start", "discovery", "plan"],
      sequence: 1,
    },
    {
      slug: "non-technical-clients",
      title: "Do I need a technical background to work with you?",
      answer:
        "No. I explain decisions and trade-offs in plain language and ask for business context first. The technical choices follow from your goals, not the other way around.",
      category: "engagement" as const,
      keywords: ["non-technical", "communication", "clarity"],
      sequence: 2,
    },
    {
      slug: "what-you-receive",
      title: "What will I actually receive?",
      answer:
        "Working software or a written architecture you can act on, plus the reasoning behind it, so your team can understand and extend the result without depending on me.",
      category: "services" as const,
      keywords: ["deliverables", "handover", "documentation"],
      sequence: 3,
    },
    {
      slug: "application-security",
      title: "How do you keep solutions secure?",
      answer:
        "Security is part of the design rather than a final check: authenticated access, validated input, least-privilege administration, and regular dependency review.",
      category: "technical" as const,
      keywords: ["security", "auth", "hardening"],
      sequence: 4,
    },
    {
      slug: "ongoing-support",
      title: "Can you support the solution after launch?",
      answer:
        "Ongoing support can be agreed separately from the build, so you can choose the level that fits your team.",
      category: "engagement" as const,
      keywords: ["support", "maintenance", "operations"],
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

/** The draft a fixed Page starts from; reused when a Page is added later. */
export const getFoundationPageDraft = (routeKey: TPageRouteKey) =>
  structuredClone(pageDrafts[routeKey]);

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
    "Draft-only three-role Site, managed-media intents, navigation, fallback policy, and fixed Page composition.",
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
          "Non-human editorial social preview aligned with the three-role system.",
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

const DEMO_SEED_VERSION = 3 as const;

const demoProjectCategoryId = foundationObjectId("demo:project-category");
const demoArticleCategoryId = foundationObjectId("demo:article-category");

const demoCategoryRecords = (actor: SeedActor): SeedRecordDefinition[] => [
  {
    stage: "categories",
    collection: "project_categories",
    seed_key: "demo.project-category",
    seed_version: DEMO_SEED_VERSION,
    lookup: { slug: "demo-projects" },
    payload: {
      _id: demoProjectCategoryId,
      name: "Demo Projects",
      slug: "demo-projects",
      description: "Synthetic category used only outside production.",
      sequence: 1,
      status: "active",
      is_deleted: false,
    },
    insert_only: { created_by: actor._id, updated_by: actor._id },
    update_only: { updated_by: actor._id },
    truth: demoTruth,
    validate: (document) => assertSchema(demoCategorySchema, document),
  },
  {
    stage: "categories",
    collection: "article_categories",
    seed_key: "demo.article-category",
    seed_version: DEMO_SEED_VERSION,
    lookup: { slug: "demo-articles" },
    payload: {
      _id: demoArticleCategoryId,
      name: "Demo Articles",
      slug: "demo-articles",
      description: "Synthetic category used only outside production.",
      sequence: 1,
      status: "active",
      is_deleted: false,
    },
    insert_only: { created_by: actor._id, updated_by: actor._id },
    update_only: { updated_by: actor._id },
    truth: demoTruth,
    validate: (document) => assertSchema(demoCategorySchema, document),
  },
];

// Visibly synthetic case studies that show how a problem-first project reads:
// the client's problem, the approach, then what changed. Every string is a
// placeholder, so none of it can pass for a real client, engagement or result.
const DEMO_FIXTURES: Record<
  (typeof PILLAR_KEYS)[number],
  Readonly<{
    project: Readonly<{
      name: string;
      description: string;
      problem: string;
      role: string;
      constraints: readonly string[];
      decisions: readonly string[];
      learnings: readonly string[];
    }>;
    article: Readonly<{
      name: string;
      excerpt: string;
      topics: readonly string[];
    }>;
  }>
> = {
  system_architect: {
    project: {
      name: "Demo: Untangling a slow, fragile system",
      description:
        "Placeholder case study showing how a problem-first project reads.",
      problem:
        "[Placeholder] The client's system had grown slow and hard to change, and nobody could say what was safe to touch.",
      role: "[Placeholder] Led the architecture review and the migration plan.",
      constraints: ["[Placeholder] A small team with no time for a rewrite"],
      decisions: [
        "[Placeholder] Fix the slowest bottleneck first",
        "[Placeholder] Write down every trade-off",
      ],
      learnings: [
        "[Placeholder] Small, reversible steps beat big-bang rewrites",
      ],
    },
    article: {
      name: "Demo: How to choose between two good options",
      excerpt: "Placeholder note showing how a decision article reads.",
      topics: ["demo", "architecture"],
    },
  },
  software_developer: {
    project: {
      name: "Demo: Replacing a spreadsheet with a real product",
      description:
        "Placeholder case study showing how a problem-first project reads.",
      problem:
        "[Placeholder] The team tracked its work in spreadsheets and lost hours every week reconciling them.",
      role: "[Placeholder] Designed and built the web product end to end.",
      constraints: [
        "[Placeholder] Staff had to keep working during the switch",
      ],
      decisions: [
        "[Placeholder] Ship the smallest useful version first",
        "[Placeholder] Keep the admin simple enough to hand over",
      ],
      learnings: [
        "[Placeholder] Early feedback changed the plan for the better",
      ],
    },
    article: {
      name: "Demo: Shipping the smallest useful version",
      excerpt: "Placeholder note showing how a delivery article reads.",
      topics: ["demo", "software"],
    },
  },
  ai_automation: {
    project: {
      name: "Demo: Automating a repetitive weekly task",
      description:
        "Placeholder case study showing how a problem-first project reads.",
      problem:
        "[Placeholder] A weekly manual report took hours to prepare and was easy to get wrong.",
      role: "[Placeholder] Built the automation and its review step.",
      constraints: [
        "[Placeholder] A person had to approve anything customer-facing",
      ],
      decisions: [
        "[Placeholder] Keep a human review step",
        "[Placeholder] Make the automation easy to switch off",
      ],
      learnings: ["[Placeholder] Visible failure alerts built trust"],
    },
    article: {
      name: "Demo: Automation that stays under human control",
      excerpt: "Placeholder note showing how an automation article reads.",
      topics: ["demo", "automation"],
    },
  },
};

const DEMO_BODY =
  "Synthetic demo content. It exists only to preview how a problem-first page is laid out outside production, and it describes no real client, engagement, or result.";

const demoProjectRecords = (actor: SeedActor): SeedRecordDefinition[] =>
  PILLAR_CONTRACT.map((pillar, index) => {
    const fixture = DEMO_FIXTURES[pillar.key].project;
    const slug = `demo-${pillar.key.replace(/_/g, "-")}-project`;
    return {
      stage: "projects_resources" as const,
      collection: "projects" as const,
      seed_key: `demo.project.${pillar.key.replace(/_/g, "-")}`,
      seed_version: DEMO_SEED_VERSION,
      lookup: { slug },
      payload: {
        _id: foundationObjectId(`demo:project:${pillar.key}`),
        name: fixture.name,
        slug,
        description: fixture.description,
        problem: fixture.problem,
        role: fixture.role,
        constraints: [...fixture.constraints],
        decisions: [...fixture.decisions],
        learnings: [...fixture.learnings],
        content: DEMO_BODY,
        category: demoProjectCategoryId,
        author: actor._id,
        tags: ["demo", "placeholder"],
        primary_pillar: pillar.key,
        secondary_pillars: [],
        delivery_status: "delivered",
        publication_status: "draft",
        project_type: "personal",
        sequence: index + 1,
        is_featured: true,
        is_deleted: false,
      },
      insert_only: { created_by: actor._id, updated_by: actor._id },
      update_only: { updated_by: actor._id },
      truth: demoTruth,
      validate: (document) => assertSchema(demoProjectSchema, document),
    };
  });

const demoArticleRecords = (actor: SeedActor): SeedRecordDefinition[] =>
  PILLAR_CONTRACT.map((pillar, index) => {
    const fixture = DEMO_FIXTURES[pillar.key].article;
    const slug = `demo-${pillar.key.replace(/_/g, "-")}-article`;
    return {
      stage: "articles" as const,
      collection: "articles" as const,
      seed_key: `demo.article.${pillar.key.replace(/_/g, "-")}`,
      seed_version: DEMO_SEED_VERSION,
      lookup: { slug },
      payload: {
        _id: foundationObjectId(`demo:article:${pillar.key}`),
        name: fixture.name,
        slug,
        excerpt: fixture.excerpt,
        content: DEMO_BODY,
        category: demoArticleCategoryId,
        author: actor._id,
        topics: [...fixture.topics],
        primary_pillar: pillar.key,
        secondary_pillars: [],
        status: "draft",
        is_featured: true,
        is_premium: false,
        reading_time_minutes: 3,
        reading_time_source: "manual",
        is_deleted: false,
      },
      insert_only: { created_by: actor._id, updated_by: actor._id },
      update_only: { updated_by: actor._id },
      truth: demoTruth,
      validate: (document) => assertSchema(demoArticleSchema, document),
    };
  });

export const createDemoSeedManifest = (actor: SeedActor): SeedManifest => ({
  manifest_key: "portfolio-demo-fixtures",
  seed_version: DEMO_SEED_VERSION,
  mode: "demo",
  description:
    "Visibly synthetic, non-production-only draft fixtures: one problem-first project and one article per role, published from the admin when reviewing layout.",
  truth: demoTruth,
  media: [],
  records: [
    ...demoCategoryRecords(actor),
    ...demoProjectRecords(actor),
    ...demoArticleRecords(actor),
  ],
});
