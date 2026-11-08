import { z } from "zod";
import type { CaseStudyArchitecture } from "../content/case-study-contract.ts";
import {
  LAUNCH_CASE_STUDIES,
  launchCaseStudySlug,
} from "./launch-library-content.ts";

// Site additions of seed v8 (plan sections 5.2 and 5.4). All of it is draft copy
// for the owner to review. Nothing here states a fact the repository cannot
// back: every record that depends on an unconfirmed owner decision (plan
// section 8: C-13 to C-18, C-31 to C-33) is kept off and unverified, and the
// fields that would need such a fact are left out.

/** The day the evidence metrics below were derived; they are hidden 180 days later. */
export const SEED_METRICS_AS_OF = "2026-11-04";

export const SITE_POSITIONING_HEADLINE =
  "Business problems in. Reliable systems out.";

// Rules for the derived values (re-derive them at each release):
//  schema_migrations   the length of MIGRATION_REGISTRY (src/lib/db/migrations/registry.ts); a unit test pins it.
//  content_redeploys   the publish flow refreshes the cache by tag (src/app/api/pages/page.cache.ts), so changing public content needs no deploy.
//  core_roles          PILLAR_CONTRACT.length (src/lib/content/pillars.ts).
//  delivery_stages     the number of seeded process steps.
//  guardrail_tracks    the guardrail list in architecture-workflow-section.
// The evidence strip leads with the first two; the automated-test count joins them at release
// time, once a full run supplies it (a count of collected tests is not a count of passing ones).
export const SITE_METRICS = [
  {
    key: "schema_migrations",
    label: "Schema migrations applied cleanly from an empty database",
    value: "16",
    verification: "derived",
    enabled: true,
    source_slug: launchCaseStudySlug("migrations"),
    as_of: SEED_METRICS_AS_OF,
  },
  {
    key: "content_redeploys",
    label: "Redeploys needed to change public content",
    value: "None",
    verification: "derived",
    enabled: true,
    source_slug: launchCaseStudySlug("publishing"),
    as_of: SEED_METRICS_AS_OF,
  },
  {
    key: "core_roles",
    label: "Core roles",
    value: "3",
    verification: "derived",
    enabled: true,
    as_of: SEED_METRICS_AS_OF,
  },
  {
    key: "delivery_stages",
    label: "Defined delivery stages",
    value: "6",
    verification: "derived",
    enabled: true,
    as_of: SEED_METRICS_AS_OF,
  },
  {
    key: "guardrail_tracks",
    label: "Guardrail tracks",
    value: "3",
    verification: "derived",
    enabled: true,
    as_of: SEED_METRICS_AS_OF,
  },
] as const;

// Method statements, each taken from copy that already ships in the seeded
// process, services and FAQs. "You own the code" is deliberately absent (C-16).
const COMMITMENTS = [
  {
    key: "small-releases",
    title: "Small, reviewable releases",
    summary:
      "Working increments you can review early, instead of one big reveal at the end.",
    enabled: true,
  },
  {
    key: "decisions-written-down",
    title: "Every decision written down",
    summary:
      "Realistic options are compared and the reasoning is recorded in a decision record, so trade-offs stay visible.",
    enabled: true,
  },
  {
    key: "tests-on-critical-paths",
    title: "Tests on the critical paths",
    summary: "Automated tests cover the flows that matter most.",
    enabled: true,
  },
  {
    key: "security-from-the-start",
    title: "Security built in from the start",
    summary:
      "Security is part of the design rather than a final check: authenticated access, validated input, least-privilege administration, and regular dependency review.",
    enabled: true,
  },
  {
    key: "handover-documentation",
    title: "Handover documentation, so your team is never stuck",
    summary:
      "Documentation your team can run with, delivered with the release.",
    enabled: true,
  },
] as const;

// Voice and stance (C-18): written from copy already seeded, switched off until approved.
const PRINCIPLES = [
  {
    key: "problem-first",
    title: "Start with the problem, not the technology",
    summary:
      "Understand the business goal, the people affected, and the constraint that hurts most before choosing any technology.",
    enabled: true,
  },
  {
    key: "simplest-thing",
    title: "Choose the simplest thing that works",
    summary:
      "Compare realistic options, pick the simplest one that works, and write down why.",
    enabled: true,
  },
  {
    key: "show-trade-offs",
    title: "Show the trade-offs",
    summary: "Every trade-off is explained in plain language.",
    enabled: true,
  },
  {
    key: "ship-small",
    title: "Ship small",
    summary:
      "Ship working increments you can review early, instead of one big reveal at the end.",
    enabled: true,
  },
  {
    key: "leave-documented",
    title: "Leave it better documented than I found it",
    summary: "Hand over documentation your team can run with.",
    enabled: true,
  },
] as const;

// Illustrative flow, labelled as such (plan 5.4, Pipeline). Not a client project.
const WORKFLOW_EXAMPLE = {
  title: "Automation you can trust, one step at a time",
  caption:
    "An illustrative flow, not a client project: how an inbound request becomes finished work without anyone copying and pasting.",
  illustrative: true,
  nodes: [
    {
      key: "input",
      kind: "input",
      label: "Input",
      summary: "A request arrives by email, form or webhook.",
      on_failure: "Kept in a queue, never dropped.",
    },
    {
      key: "automation",
      kind: "automation",
      label: "Automation",
      summary: "Rules clean it, route it and add the missing details.",
      on_failure: "Retries, then an alert to a named person.",
    },
    {
      key: "agent",
      kind: "agent",
      label: "AI agent",
      summary:
        "A model classifies it or drafts a reply, inside limits you set.",
      on_failure: "Falls back to the manual path.",
    },
    {
      key: "review",
      kind: "review",
      label: "Review gate",
      summary: "A person approves anything risky before it goes out.",
      on_failure: "Waits; nothing is sent without approval.",
    },
    {
      key: "output",
      kind: "output",
      label: "Output",
      summary:
        "The result lands where your team already works, with an audit trail.",
      on_failure: "Logged and retried.",
    },
  ],
  switch_off:
    "One switch turns the whole thing off, and everything it did is logged.",
} as const;

// No times are promised (C-04).
const NEXT_STEPS = [
  {
    key: "describe",
    title: "You describe the problem",
    summary: "A few lines are enough.",
    enabled: true,
  },
  {
    key: "straight-answer",
    title: "I reply with a straight answer",
    summary: "Whether I can help, and what I would need to know.",
    enabled: true,
  },
  {
    key: "first-step",
    title: "We agree a first small step",
    summary: "Scope and timing are written down before work starts.",
    enabled: true,
  },
] as const;

// Which models are offered, their scope, duration and price are all unconfirmed
// (C-13 to C-15): off and unverified, with no price, no duration, and no
// "how it runs" or "you get" where the plan leaves that to the owner.
const ENGAGEMENT_MODELS = [
  {
    key: "architecture-review",
    name: "Architecture review",
    best_when: "A system is hurting, or a build is about to be committed to.",
    you_get: [
      "Written architecture",
      "Decision record",
      "Risks",
      "Delivery roadmap",
    ],
    verification: "unverified",
    enabled: false,
  },
  {
    key: "build-product-or-automation",
    name: "Build a product or automation",
    best_when: "The problem is clear and you need it working.",
    you_get: [
      "Reviewable releases",
      "Automated tests",
      "Handover documentation",
    ],
    verification: "unverified",
    enabled: false,
  },
  {
    key: "ongoing-partnership",
    name: "Ongoing partnership",
    best_when:
      "You need a senior engineer as the system grows, or an architecture partner for your agency.",
    you_get: [],
    verification: "unverified",
    enabled: false,
  },
] as const;

// The owner approved the stances (C-32) on 2026-11-08 and switched the fit check on.
const FIT = {
  enabled: true,
  segments: [
    {
      key: "founders",
      label: "Founders and product teams",
      for_you_if:
        "Bring the idea, leave with a plan and a working first version.",
    },
    {
      key: "operations",
      label: "Operations teams",
      for_you_if:
        "Bring the repetitive task, leave with an automation you can trust.",
    },
    {
      key: "agencies",
      label: "Agencies",
      for_you_if:
        "Bring the client brief; I design and build the technical side.",
    },
    {
      key: "internal-teams",
      label: "Internal teams",
      for_you_if: "Bring the legacy system; I make the next step safe.",
    },
  ],
  not_a_fit: [
    "You need a large team on call around the clock.",
    "You want a website with no system behind it.",
    "You want the lowest quote above all else.",
  ],
} as const;

// Draft rules pending C-13: every outcome points at an engagement model that is
// itself switched off, so the finder stays off with it.
const FINDER = {
  enabled: false,
  steps: [
    {
      key: "situation",
      question: "What is the situation?",
      options: [
        {
          key: "systems",
          label: "Software, data or architecture",
          tags: ["systems"],
        },
        {
          key: "automation",
          label: "Repetitive work, AI or integrations",
          tags: ["automation"],
        },
      ],
    },
    {
      key: "stage",
      question: "Where are you now?",
      options: [
        { key: "idea", label: "We only have an idea", tags: ["idea"] },
        { key: "hurts", label: "It works but it hurts", tags: ["hurts"] },
        { key: "growing", label: "It runs and is growing", tags: ["growing"] },
      ],
    },
    {
      key: "priority",
      question: "What matters most?",
      options: [
        { key: "speed", label: "Speed", tags: ["speed"] },
        { key: "reliability", label: "Reliability", tags: ["reliability"] },
        { key: "cost", label: "Cost", tags: ["cost"] },
      ],
    },
  ],
  outcomes: [
    {
      engagement_key: "build-product-or-automation",
      when_tags: ["idea"],
      reasoning:
        "You have the idea, and the quickest way to learn is a working first version.",
    },
    {
      engagement_key: "architecture-review",
      when_tags: ["hurts", "reliability"],
      reasoning:
        "It works but it hurts, so the first step is to find out why before changing it.",
    },
    {
      engagement_key: "ongoing-partnership",
      when_tags: ["growing"],
      reasoning:
        "It is running and growing, so a steady technical partner keeps the next step safe.",
    },
  ],
} as const;

const SAMPLE_SOURCE = "From this site's own repository";
// Joins the verbatim passages of an excerpt; tests check each passage against its source file.
export const SAMPLE_GAP = "\n\n[...]\n\n";

const renderDiagram = (diagram: CaseStudyArchitecture): string => {
  const label = (key: string) =>
    diagram.nodes.find((node) => node.key === key)?.label ?? key;
  return [
    `Layers: ${diagram.layers.join(", ")}`,
    "",
    ...diagram.edges.map(
      (edge) =>
        `${label(edge.from)} -> ${label(edge.to)}${edge.label ? `: ${edge.label}` : ""}`
    ),
  ].join("\n");
};

const migrationCaseStudy = LAUNCH_CASE_STUDIES.find(
  (study) => study.key === "migrations"
)!;

// Passages are copied from files in this repository (docs/architecture/0008-migrations-and-audit-events.md,
// docs/data/seeding.md) and from a real run of the commands named in them. They hold no
// secret, host, address or person. Each stays off until the owner approves it (C-31).
export const SITE_DELIVERABLE_SAMPLES = [
  {
    key: "decision-record",
    title: "Decision record: migrations and audit events",
    kind: "decision_record",
    excerpt: [
      "ADR 0008: Migrations and audit events",
      "Applied files are never edited, reordered, reused, or deleted. A checksum mismatch or duplicate/out-of-order ID stops the run. A Mongo lease with owner, heartbeat, and expiry permits one runner per environment. Migrations never execute on module import, application startup, `next build`, or every serverless instance; an explicit release command/job runs them before compatible code is promoted.",
      "Destructive work requires a verified backup/restore point, dry-run counts/samples, and expand → backfill → validate → switch readers → contract sequencing. Production has no generic automatic `down`; rollback uses compatible readers and a reviewed compensating migration.",
    ].join(SAMPLE_GAP),
    source_label: SAMPLE_SOURCE,
    verification: "derived",
    enabled: false,
  },
  {
    key: "architecture-diagram",
    title: "Architecture diagram: live-database migrations",
    kind: "diagram",
    excerpt: renderDiagram(migrationCaseStudy.architecture),
    source_label: SAMPLE_SOURCE,
    source_slug: launchCaseStudySlug("migrations"),
    verification: "derived",
    enabled: false,
  },
  {
    key: "runbook",
    title: "Runbook: safe portfolio seeding",
    kind: "runbook",
    excerpt: [
      "Use the repository-declared Node.js and pnpm versions, apply the schema migrations, then run the locked administrator bootstrap once if the database has no users.",
      "pnpm auth:bootstrap-super-admin\npnpm db:migrate:dry-run\npnpm db:migrate\npnpm seed:dry-run\npnpm seed",
      "Seed writes require replica-set or mongos transaction support; there is no non-transactional write fallback.",
      "Always review `seed:dry-run` and take an independently verified database backup before a production apply.",
    ].join(SAMPLE_GAP),
    source_label: SAMPLE_SOURCE,
    verification: "derived",
    enabled: false,
  },
  {
    key: "test-report",
    title: "Test report: seed and content-contract suites",
    kind: "report",
    // Lines of a real `vitest run --reporter=verbose` over the seed and content-gate unit files (2026-11-04).
    excerpt: [
      " ✓ tests/unit/content-truth-gate.test.ts > content truth manifest > holds well-formed, unique claims 23ms",
      " ✓ tests/unit/content-truth-gate.test.ts > content gate for the seeded Site > contains no placeholder or open-question marker in any seeded public text 1ms",
      " Test Files  5 passed (5)\n      Tests  37 passed (37)",
    ].join(SAMPLE_GAP),
    source_label: SAMPLE_SOURCE,
    verification: "derived",
    enabled: false,
  },
  {
    key: "seed-dry-run",
    title: "Seed dry run on an empty database",
    kind: "dry_run",
    // Lines of a real `pnpm seed:dry-run` against a throwaway local database (2026-11-04); the checksum line is left out because it would cover this text.
    excerpt: [
      '{\n  "manifest_key": "portfolio-foundation",\n  "seed_version": 8,\n  "counts": {\n    "create": 46,\n    "update": 0,\n    "adopt": 0,\n    "unchanged": 0,\n    "conflict": 0\n  },',
      '    {\n      "stage": "site",\n      "seed_key": "site.primary",\n      "action": "create",\n      "reason": "target_missing",\n      "changed_fields": [\n        "contract_version",\n        "draft",\n        "published",\n        "revision",\n        "schema_version",\n        "site_key"\n      ]\n    },',
    ].join(SAMPLE_GAP),
    source_label: SAMPLE_SOURCE,
    verification: "derived",
    enabled: false,
  },
] as const;

const plain = (min: number, max: number) =>
  z
    .string()
    .min(min)
    .max(max)
    .refine(
      (value) =>
        !/[<>\u0000-\u001f\u007f]/.test(value) &&
        !/(?:javascript|data|vbscript)\s*:/i.test(value),
      "Use plain text without markup or executable content"
    );
const keySchema = z
  .string()
  .max(64)
  .regex(/^[a-z][a-z0-9]*(?:[-_][a-z0-9]+)*$/);
const slugSchema = z
  .string()
  .max(96)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const verification = z.enum(["unverified", "derived", "verified"]);

const commitmentSchema = z
  .object({
    key: keySchema,
    title: plain(2, 100),
    summary: plain(2, 300),
    enabled: z.boolean(),
  })
  .strict();

/** Draft fields added in seed v8. The literals are the truth rules: a model, the finder or a sample cannot be enabled by accident (the fit check and the principles were switched on by the owner on 2026-11-08). */
export const siteContentShape = {
  engagement_models: z
    .array(
      z
        .object({
          key: keySchema,
          name: plain(2, 80),
          best_when: plain(2, 300),
          you_get: z.array(plain(2, 200)).max(6),
          verification: z.literal("unverified"),
          enabled: z.literal(false),
        })
        .strict()
    )
    .max(4),
  commitments: z.array(commitmentSchema).max(6),
  workflow_example: z
    .object({
      title: plain(2, 120),
      caption: plain(2, 300),
      illustrative: z.literal(true),
      nodes: z
        .array(
          z
            .object({
              key: keySchema,
              kind: z.enum([
                "input",
                "automation",
                "agent",
                "review",
                "output",
              ]),
              label: plain(1, 40),
              summary: plain(2, 200),
              on_failure: plain(2, 160),
            })
            .strict()
        )
        .min(2)
        .max(8),
      switch_off: plain(2, 200),
    })
    .strict(),
  deliverable_samples: z
    .array(
      z
        .object({
          key: keySchema,
          title: plain(2, 100),
          kind: z.enum([
            "decision_record",
            "diagram",
            "runbook",
            "report",
            "dry_run",
          ]),
          excerpt: z
            .string()
            .min(2)
            .max(1200)
            .refine(
              (value) =>
                !/[<\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
            ),
          source_label: plain(2, 120),
          source_slug: slugSchema.optional(),
          verification: z.literal("derived"),
          enabled: z.literal(false),
        })
        .strict()
    )
    .max(6),
  next_steps: z
    .array(
      z
        .object({
          key: keySchema,
          title: plain(2, 80),
          summary: plain(2, 240),
          enabled: z.boolean(),
        })
        .strict()
    )
    .max(4),
  fit: z
    .object({
      enabled: z.boolean(),
      segments: z
        .array(
          z
            .object({
              key: keySchema,
              label: plain(1, 60),
              for_you_if: plain(2, 240),
            })
            .strict()
        )
        .max(6),
      not_a_fit: z.array(plain(2, 200)).max(6),
    })
    .strict(),
  principles: z.array(commitmentSchema).max(6),
  finder: z
    .object({
      enabled: z.literal(false),
      steps: z
        .array(
          z
            .object({
              key: keySchema,
              question: plain(2, 140),
              options: z
                .array(
                  z
                    .object({
                      key: keySchema,
                      label: plain(1, 80),
                      tags: z.array(keySchema).min(1).max(4),
                    })
                    .strict()
                )
                .min(2)
                .max(6),
            })
            .strict()
        )
        .max(4),
      outcomes: z
        .array(
          z
            .object({
              engagement_key: keySchema,
              when_tags: z.array(keySchema).min(1).max(4),
              reasoning: plain(2, 240),
            })
            .strict()
        )
        .max(8),
    })
    .strict(),
};

export const siteMetricSchema = z
  .object({
    key: keySchema,
    label: z.string().min(1).max(80),
    value: z.string().min(1).max(80).optional(),
    verification,
    enabled: z.boolean(),
    source_slug: slugSchema.optional(),
    as_of: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
  })
  .strict();

/** What the Site draft gains in seed v8, spread into the draft by the foundation seed. */
export const createSiteContentV8 = () =>
  structuredClone({
    engagement_models: ENGAGEMENT_MODELS,
    commitments: COMMITMENTS,
    workflow_example: WORKFLOW_EXAMPLE,
    deliverable_samples: SITE_DELIVERABLE_SAMPLES,
    next_steps: NEXT_STEPS,
    fit: FIT,
    principles: PRINCIPLES,
    finder: FINDER,
  });
