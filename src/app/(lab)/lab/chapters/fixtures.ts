import type { TPublicFAQDto } from "@/app/api/faqs/faq.type";
import type {
  TResolvedPageSection,
  TResolvedPublishedPagePayload,
} from "@/app/api/pages/page-resolver.type";
import type { TPageSectionKind } from "@/app/api/pages/page.type";
import type {
  TPublicServiceDto,
  TServiceProblem,
} from "@/app/api/services/service.type";
import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import type { TPublicSkillDto } from "@/app/api/skills/skill.type";
import type { TPublicSkillGroupWithSkills } from "@/components/sections/skills-section";
import type { PillarKey } from "@/lib/content/pillars";
import { normalizeSlug } from "@/lib/content/slug";
import {
  SITE_METRICS,
  SITE_POSITIONING_HEADLINE,
  createSiteContentV8,
} from "@/lib/seed/foundation-site-content";
import { LAUNCH_ARTICLES, LAUNCH_PILLAR_COPY } from "@/lib/seed/launch-content";
import {
  LAUNCH_CASE_STUDIES,
  LAUNCH_CASE_STUDY_CATEGORIES,
  launchCaseStudySlug,
  type LaunchCaseStudyKey,
} from "@/lib/seed/launch-library-content";
import type { TArticleListItem } from "@/types/article.type";
import type { TCaseStudyListItem } from "@/types/case-study.type";

/**
 * The home page with every chapter switched on (tier 2 included), built from fixtures so the page
 * renders without a database. Copy comes from the seed modules where they export it, and from short
 * literals copied out of src/lib/seed/foundation.ts where they do not.
 */

type Mutable<T> = { -readonly [K in keyof T]: Mutable<T[K]> };

const PUBLISHED_AT = "2026-11-04T00:00:00.000Z";
// Metric values older than the freshness window are hidden, so the lab dates them relative to today.
const AS_OF = new Date(Date.now() - 3 * 86_400_000).toISOString().slice(0, 10);

const base = createEmergencyPublicSite();
const v8 = createSiteContentV8() as Mutable<
  ReturnType<typeof createSiteContentV8>
>;

// foundation.ts PILLAR_COPY (not exported)
const PILLAR_COPY: Record<
  PillarKey,
  Readonly<{
    headline: string;
    summary: string;
    capabilities: string[];
    technologies: string[];
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

const PROCESS = [
  [
    "discovery",
    "1. Understand the problem",
    "Start from the business goal, the people affected, and the constraint that hurts most, before choosing any technology.",
    "Problem brief and success measures",
  ],
  [
    "design",
    "2. Shape the solution",
    "Compare realistic options, pick the simplest one that works, and write down why.",
    "Solution outline and decision record",
  ],
  [
    "development",
    "3. Build in small steps",
    "Ship working increments you can review early, instead of one big reveal at the end.",
    "Reviewable releases and automated tests",
  ],
  [
    "hardening",
    "4. Make it dependable",
    "Check security, accessibility, and performance so the solution holds up under real use.",
    "Quality and security review notes",
  ],
  [
    "delivery",
    "5. Launch and hand over",
    "Release through automated pipelines with monitoring in place, and hand over documentation your team can run with.",
    "Production release and handover notes",
  ],
  [
    "evolution",
    "6. Measure and improve",
    "Watch the numbers that mattered at the start and keep improving what moves them.",
    "Outcome review and next-step plan",
  ],
].map(([key, title, summary, deliverable]) => ({
  key: key!,
  title: title!,
  summary,
  deliverable,
  enabled: true,
}));

// The v8 models are unverified and bare (owner decisions pending), so the lab fills the gaps.
const ENGAGEMENT_EXTRAS = [
  {
    how_it_runs:
      "A short review of your code, data and constraints, then a written report you can act on.",
    duration_label: "Short and fixed-length",
  },
  {
    how_it_runs:
      "Reviewable releases in small steps, with a short demo at the end of each one.",
    duration_label: "Until the first version ships",
    price_label: "Fixed fee per milestone",
  },
  {
    how_it_runs:
      "A regular rhythm of reviews and hands-on work as the system grows.",
    duration_label: "Ongoing, month to month",
    you_get: [
      "A senior engineer for the system",
      "Regular architecture and cost reviews",
      "Documentation that stays current",
    ],
  },
];

// The first four seeded metrics; the last two are marked verified, with case studies as their source
const METRIC_STATE = [
  { verification: "derived", source: "migrations" },
  { verification: "derived", source: "publishing" },
  { verification: "verified", source: "publishing" },
  { verification: "verified", source: "upkeep" },
] as const;

export const site: TPublicSiteDto = {
  ...base,
  content_source: "published",
  published_revision: 1,
  published_at: PUBLISHED_AT,
  identity: { locale: "en", public_name: "Foysal Ahmed" },
  positioning: {
    ...base.positioning,
    headline: SITE_POSITIONING_HEADLINE,
    compact:
      "I turn business problems into clear architectures, working software, and dependable automation.",
    client_promise:
      "Bring me the problem. You will get a clear plan, working software in small reviewable steps, and honest advice on what is not worth building.",
  },
  pillars: base.pillars.map((pillar) => ({
    ...pillar,
    ...PILLAR_COPY[pillar.key],
    client_outcome: LAUNCH_PILLAR_COPY[pillar.key].client_outcome,
  })),
  primary_ctas: [
    {
      key: "contact",
      label: "Start a conversation",
      kind: "internal",
      href: "/contact",
      enabled: true,
    },
  ],
  experience: {
    ...base.experience,
    feature_flags: {
      show_availability: false,
      show_metrics: true,
      show_testimonials: true,
    },
  },
  process: PROCESS,
  metrics: SITE_METRICS.slice(0, 4).map((metric, index) => ({
    ...metric,
    verification: METRIC_STATE[index]!.verification,
    source_slug: launchCaseStudySlug(METRIC_STATE[index]!.source),
    as_of: AS_OF,
  })),
  engagement_models: v8.engagement_models.map((model, index) => ({
    ...model,
    ...ENGAGEMENT_EXTRAS[index],
    verification: "verified",
    enabled: true,
  })),
  commitments: v8.commitments,
  workflow_example: v8.workflow_example,
  deliverable_samples: v8.deliverable_samples.map((sample) => ({
    ...sample,
    enabled: true,
  })),
  next_steps: v8.next_steps,
  fit: { ...v8.fit, enabled: true },
  principles: v8.principles.map((principle) => ({
    ...principle,
    enabled: true,
  })),
  finder: { ...v8.finder, enabled: true },
};

const listing = (
  slug: string,
  title: string,
  pillar: PillarKey,
  order: number
) => ({
  slug,
  locale: "en" as const,
  title,
  primary_pillar: pillar,
  secondary_pillars: [],
  sequence: order,
  is_featured: true,
  published_at: PUBLISHED_AT,
});

// foundation.ts createServiceRecords (not exported)
const SERVICE_COPY: readonly {
  pillar: PillarKey;
  slug: string;
  title: string;
  outcome: string;
  deliverables: string[];
  problems: TServiceProblem[];
}[] = [
  {
    pillar: "system_architect",
    slug: "architecture-system-design",
    title: "Architecture & System Design",
    outcome:
      "A clear technical blueprint that reduces risk, rework, and running cost before the build begins.",
    deliverables: [
      "Solution architecture overview",
      "Decision record with trade-offs",
      "Delivery roadmap with milestones",
    ],
    problems: [
      {
        key: "software-keeps-breaking",
        pain: "Our software keeps breaking as we grow.",
        approach:
          "Map the failure points, redesign data and service boundaries, migrate in safe steps.",
        deliverable: "Architecture review, decision record, migration plan",
        outcome:
          "A system that scales on purpose, with the risks written down.",
        case_slug: launchCaseStudySlug("migrations"),
      },
      {
        key: "unknown-cost",
        pain: "Nobody can tell us what this will cost to build or run.",
        approach:
          "Compare realistic options and costs; choose the simplest that works.",
        deliverable: "Option comparison with cost and risk notes",
        outcome: "A decision you can defend.",
      },
    ],
  },
  {
    pillar: "software_developer",
    slug: "product-software-development",
    title: "Product & Software Development",
    outcome:
      "A working, maintainable product (interface, API, and data) delivered in small steps you can review.",
    deliverables: [
      "Working software in reviewable releases",
      "Automated tests for the critical flows",
      "Handover documentation for your team",
    ],
    problems: [
      {
        key: "idea-to-product",
        pain: "We have an idea, or a spreadsheet, that needs to become a real product.",
        approach:
          "Define the smallest useful version and build it end to end in reviewable releases.",
        deliverable: "Working product, tests, handover documentation",
        outcome: "Something real in users' hands that your team can extend.",
      },
      {
        key: "manual-internal-tools",
        pain: "Our internal tools are slow, manual or held together by spreadsheets.",
        approach:
          "Replace the weakest workflow first with a small, tested internal tool.",
        deliverable: "Admin panel or internal tool in production",
        outcome: "Staff stop working around the system.",
        case_slug: launchCaseStudySlug("publishing"),
      },
    ],
  },
  {
    pillar: "ai_automation",
    slug: "ai-workflow-automation",
    title: "AI & Workflow Automation",
    outcome:
      "Repetitive manual work replaced by automation your team can trust, audit, and switch off.",
    deliverables: [
      "Automated workflow running in production",
      "Monitoring and failure alerts",
      "Runbook for your team",
    ],
    problems: [
      {
        key: "repetitive-error-prone-steps",
        pain: "My team spends hours on repetitive, error-prone steps.",
        approach:
          "Find the manual steps and automate them with monitoring and a switch-off.",
        deliverable: "Automated workflow in production, runbook",
        outcome:
          "Fewer manual steps and fewer errors, measured against a baseline we agree.",
        case_slug: launchCaseStudySlug("upkeep"),
      },
      {
        key: "ai-demo-not-workflow",
        pain: "We tried AI and it works in a demo but not in the real workflow.",
        approach:
          "Add human review, logging and fallbacks so the output can be trusted.",
        deliverable: "LLM-assisted feature with review gate and monitoring",
        outcome: "AI that your team can trust, audit and turn off.",
      },
      {
        key: "tools-do-not-talk",
        pain: "Our tools do not talk to each other.",
        approach:
          "Connect them with reliable integrations and background jobs.",
        deliverable: "Integrations with failure alerts",
        outcome: "Data moves once, correctly, without copy and paste.",
      },
    ],
  },
];

const services: TPublicServiceDto[] = SERVICE_COPY.map((copy, index) => ({
  ...listing(copy.slug, copy.title, copy.pillar, index),
  outcome: copy.outcome,
  capabilities: PILLAR_COPY[copy.pillar].capabilities,
  deliverables: copy.deliverables,
  technologies: PILLAR_COPY[copy.pillar].technologies.slice(0, 5),
  problems: copy.problems,
}));

// One case study per pillar, with a different engagement type each
const CASE_STUDY_KEYS: readonly [
  LaunchCaseStudyKey,
  TCaseStudyListItem["engagement_type"],
][] = [
  ["migrations", "client"],
  ["publishing", "internal"],
  ["upkeep", "open_source"],
];

const caseStudies: TCaseStudyListItem[] = CASE_STUDY_KEYS.flatMap(
  ([key, engagement_type]) => {
    const study = LAUNCH_CASE_STUDIES.find((entry) => entry.key === key);
    const category = LAUNCH_CASE_STUDY_CATEGORIES.find(
      (entry) => entry.slug === study?.category
    );
    if (!study || !category) return [];
    return [
      {
        _id: `lab-case-study-${key}`,
        slug: launchCaseStudySlug(key),
        name: study.name,
        description: study.description,
        category: { _id: `lab-${category.slug}`, ...category },
        client_industry: study.industry,
        engagement_type,
        primary_pillar: study.pillar,
        role: study.role,
        duration_label: study.duration,
        tech_stack: [...study.tools],
        outcomes: study.outcomes.map((outcome) => ({
          ...outcome,
          verification_state: "derived" as const,
        })),
        is_featured: true,
        published_at: PUBLISHED_AT,
        updated_at: PUBLISHED_AT,
      },
    ];
  }
);

// One note per pillar, taken from the launch articles
const articles: TArticleListItem[] = [0, 1, 5].flatMap((index) => {
  const article = LAUNCH_ARTICLES[index];
  if (!article) return [];
  return [
    {
      _id: `lab-article-${index}`,
      slug: normalizeSlug(article.name),
      name: article.name,
      description: article.excerpt,
      excerpt: article.excerpt,
      tags: [...article.topics],
      category: null,
      author: { _id: "lab-author", name: "Foysal Ahmed" },
      primary_pillar: article.pillar,
      topics: [...article.topics],
      reading_time_minutes: article.minutes,
      reading_time_source: "manual" as const,
      is_featured: true,
      is_premium: false,
      published_at: PUBLISHED_AT,
      updated_at: PUBLISHED_AT,
    },
  ];
});

// foundation.ts createSkillGroupRecords / createSkillRecords (not exported)
const SKILL_GROUPS: readonly {
  pillar: PillarKey;
  slug: string;
  title: string;
  description: string;
  skills: readonly [string, TPublicSkillDto["proficiency_level"]][];
}[] = [
  {
    pillar: "system_architect",
    slug: "architecture-infrastructure",
    title: "Architecture & Infrastructure",
    description:
      "The decisions that keep a product secure, scalable, and affordable to run.",
    skills: [
      ["System & Solution Architecture", "advanced"],
      ["Database & Data Modeling", "advanced"],
      ["Caching & Messaging", "working"],
      ["Security by Design", "advanced"],
    ],
  },
  {
    pillar: "software_developer",
    slug: "product-engineering",
    title: "Product Engineering",
    description:
      "Building the interface, the API, and the data layer of products people rely on.",
    skills: [
      ["Next.js & React", "expert"],
      ["TypeScript & JavaScript", "expert"],
      ["Node.js & Express APIs", "advanced"],
      ["Accessible, Responsive UI", "advanced"],
    ],
  },
  {
    pillar: "ai_automation",
    slug: "ai-workflows",
    title: "AI & Workflow Automation",
    description:
      "Removing repetitive work with automation that stays observable and under human control.",
    skills: [
      ["Workflow Automation", "advanced"],
      ["LLM Integration", "working"],
      ["Background Jobs & Queues", "advanced"],
      ["Human-in-the-Loop Review", "advanced"],
    ],
  },
];

const skillGroups: TPublicSkillGroupWithSkills[] = SKILL_GROUPS.map(
  (group, order) => ({
    ...listing(group.slug, group.title, group.pillar, order),
    description: group.description,
    skills: group.skills.map(
      ([title, level], index): TPublicSkillDto => ({
        ...listing(normalizeSlug(title), title, group.pillar, index),
        group: { slug: group.slug, title: group.title },
        proficiency_level: level,
        proficiency_verification: index % 2 === 0 ? "verified" : "derived",
        keywords: [],
      })
    ),
  })
);

// foundation.ts createFAQRecords (not exported), the first six
const FAQ_COPY = [
  [
    "problems-i-solve",
    "What kinds of problems can you help with?",
    "Usually one of three: a system whose design is unclear or fragile, a product that needs to be built or rescued, or repetitive manual work that automation could take over. If your problem is something else, describe it and I will tell you honestly whether I can help.",
    "services",
  ],
  [
    "getting-started",
    "How does a project start?",
    "With a short conversation about the problem, the people affected, and what success looks like. From that I propose a simple plan with milestones, so you know what happens next before you commit to anything.",
    "process",
  ],
  [
    "non-technical-clients",
    "Do I need a technical background to work with you?",
    "No. I explain decisions and trade-offs in plain language and ask for business context first. The technical choices follow from your goals, not the other way around.",
    "engagement",
  ],
  [
    "what-you-receive",
    "What will I actually receive?",
    "Working software or a written architecture you can act on, plus the reasoning behind it, so your team can understand and extend the result without depending on me.",
    "services",
  ],
  [
    "application-security",
    "How do you keep solutions secure?",
    "Security is part of the design rather than a final check: authenticated access, validated input, least-privilege administration, and regular dependency review.",
    "technical",
  ],
  [
    "ai-gets-it-wrong",
    "What if the AI gets it wrong?",
    "Anything risky waits for a person to approve it before it goes out. Every step is logged, so you can see what the automation did. When the AI cannot decide, the work falls back to the manual path, and one switch turns the whole thing off.",
    "technical",
  ],
] as const;

const faqs: TPublicFAQDto[] = FAQ_COPY.map(
  ([slug, title, answer, category], index) => ({
    ...listing(slug, title, "system_architect", index),
    question: title,
    answer: `<p>${answer}</p>`,
    category,
    keywords: [],
  })
);

// The home draft of foundation.ts (pageDrafts.home) with every section visible except `pillars`, which the
// seed keeps off on the home (the hero and the Stack present the same roles)
const HOME_SECTIONS: readonly (readonly [
  key: string,
  kind: TPageSectionKind,
  layout: string,
  heading?: string,
  items?: readonly Readonly<Record<string, unknown>>[],
])[] = [
  ["hero", "site-hero", "topology"],
  ["metrics", "metrics-strip", "evidence"],
  [
    "triage",
    "problem-index",
    "default",
    "What is slowing your business down?",
    services,
  ],
  [
    "services",
    "service-collection",
    "stack",
    "Three layers. Take one, or all.",
    services,
  ],
  [
    "architecture-workflow",
    "architecture-workflow",
    "pipeline",
    "Automation you can trust, one step at a time",
  ],
  [
    "case-studies",
    "case-study-collection",
    "files",
    "Problems solved, start to finish",
    caseStudies,
  ],
  [
    "deliverables",
    "deliverable-samples",
    "default",
    "What you actually receive",
  ],
  ["process", "process-steps", "wire", "How a project runs"],
  ["engagement", "engagement-models", "default", "Ways to work together"],
  ["fit", "fit-check", "default", "Who this is for"],
  ["finder", "starting-point", "default", "Not sure where to start?"],
  [
    "skills",
    "skill-group-collection",
    "registry",
    "The tools behind the solutions",
    skillGroups,
  ],
  ["commitments", "commitments", "default", "How I keep projects safe"],
  ["trust", "testimonial-collection", "grid", "What clients say", []],
  ["github", "github-profile", "default", "See how I build, in the open"],
  ["principles", "commitments", "principles", "How I think"],
  ["articles", "article-collection", "notes", "Field notes", articles],
  ["faqs", "faq-list", "list", "Questions before we start", faqs],
  ["contact", "contact-cta", "banner"],
];

const sections: TResolvedPageSection[] = HOME_SECTIONS.map(
  ([key, kind, layout, heading, items]) => {
    const empty = items !== undefined && items.length === 0;
    return {
      key,
      kind,
      layout,
      ...(heading ? { heading } : {}),
      source_mode: items ? "automatic" : "system",
      items: items ?? [],
      health: {
        status: empty ? "empty" : "healthy",
        requested_records: items?.length ?? 0,
        resolved_records: items?.length ?? 0,
        omitted_records: 0,
        reason_codes: empty ? ["source_empty"] : [],
      },
    };
  }
);

export const payload: TResolvedPublishedPagePayload = {
  page: {
    route_key: "home",
    route_path: "/",
    locale: "en",
    schema_version: 1,
    contract_version: 1,
    published_revision: 1,
    published_at: PUBLISHED_AT,
    seo: { noindex: true },
  },
  site,
  sections,
  health: {
    status: "healthy",
    total_sections: sections.length,
    healthy_sections: sections.filter((s) => s.health.status === "healthy")
      .length,
    degraded_sections: sections.filter((s) => s.health.status !== "healthy")
      .length,
    resolved_records: sections.reduce(
      (total, s) => total + s.health.resolved_records,
      0
    ),
    omitted_records: 0,
  },
};
