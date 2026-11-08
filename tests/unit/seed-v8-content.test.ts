import { createServiceSchema } from "@/app/api/services/service.validation";
import { getSitePublishIssues } from "@/app/api/site/site.policy";
import { siteDraftSnapshotSchema } from "@/app/api/site/site.validation";
import { createCaseStudySchema } from "@/app/api/case-studies/case-study.validation";
import { parseCaseStudyArchitecture } from "@/lib/content/case-study-contract";
import { PILLAR_CONTRACT } from "@/lib/content/pillars";
import { MIGRATION_REGISTRY } from "@/lib/db/migrations/registry";
import {
  FOUNDATION_SEED_VERSION,
  createFoundationSeedManifest,
} from "@/lib/seed";
import {
  SAMPLE_GAP,
  SEED_METRICS_AS_OF,
} from "@/lib/seed/foundation-site-content";
import { LAUNCH_PROJECTS } from "@/lib/seed/launch-content";
import {
  LAUNCH_CASE_STUDIES,
  launchCaseStudySlug,
} from "@/lib/seed/launch-library-content";
import { readFileSync } from "node:fs";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

const actor = { _id: new ObjectId(), role: "super-admin" as const };
const manifest = createFoundationSeedManifest(actor);
const record = (seedKey: string) =>
  manifest.records.find((entry) => entry.seed_key === seedKey)!;
const draft = record("site.primary").payload.draft as Record<string, any>;
const parsedDraft = () => siteDraftSnapshotSchema.parse(draft);
const flat = (text: string) => text.replace(/\s+/g, " ").trim();

describe("seed version 8: Site draft", () => {
  it("is version 8 and the whole draft passes the Site schema", () => {
    expect(FOUNDATION_SEED_VERSION).toBe(8);
    expect(manifest.seed_version).toBe(8);
    expect(() => parsedDraft()).not.toThrow();
  });

  it("adds no publish blocker in the sections it introduces", () => {
    // The seeded draft is still unpublishable (pillars are disabled); the new fields must not add to that.
    const issues = getSitePublishIssues(parsedDraft());
    expect(
      issues.filter((path) =>
        /^(metrics|process|engagement_models|deliverable_samples|fit|finder)/.test(
          path
        )
      )
    ).toEqual([]);
  });

  it("sets the headline, a dark default theme and leaves working hours unset", () => {
    expect(draft.positioning.headline).toBe(
      "Business problems in. Reliable systems out."
    );
    expect(draft.experience.theme).toBe("dark");
    expect(draft.contact).not.toHaveProperty("working_hours");
  });

  it("has the engagement models, the finder, the fit check and the principles on (owner, 2026-11-08), with no price or duration", () => {
    expect(draft.engagement_models).toHaveLength(3);
    for (const model of draft.engagement_models) {
      expect(model).toMatchObject({ enabled: true, verification: "verified" });
      expect(model.how_it_runs).toEqual(expect.any(String));
      expect(model.you_get.length).toBeGreaterThan(0);
      // C-14 and C-15 are still unconfirmed: nothing is quoted
      expect(model).not.toHaveProperty("price_label");
      expect(model).not.toHaveProperty("duration_label");
    }
    expect(draft.fit.enabled).toBe(true);
    expect(draft.finder.enabled).toBe(true);
    expect(draft.principles).toHaveLength(5);
    expect(
      draft.principles.every((item: { enabled: boolean }) => item.enabled)
    ).toBe(true);
  });

  it("keeps the deliverable samples off until each one is approved (C-31)", () => {
    expect(
      draft.deliverable_samples.every(
        (sample: { enabled: boolean }) => !sample.enabled
      )
    ).toBe(true);
  });

  it("enables the five method statements and never claims code ownership", () => {
    expect(draft.commitments).toHaveLength(5);
    expect(
      draft.commitments.every((item: { enabled: boolean }) => item.enabled)
    ).toBe(true);
    expect(JSON.stringify(draft.commitments)).not.toMatch(/own the code/i);
    expect(draft.next_steps).toHaveLength(3);
    expect(draft.workflow_example.illustrative).toBe(true);
    expect(
      draft.workflow_example.nodes.map((node: { label: string }) => node.label)
    ).toEqual(["Input", "Automation", "AI agent", "Review gate", "Output"]);
  });

  it("derives each evidence metric from the repository", () => {
    const metrics = new Map<string, Record<string, any>>(
      draft.metrics.map((metric: { key: string }) => [metric.key, metric])
    );
    expect(metrics.get("schema_migrations")!.value).toBe(
      String(MIGRATION_REGISTRY.length)
    );
    // The launch projects quote the same count; a new migration makes both stale together.
    const projectCounts = LAUNCH_PROJECTS.flatMap((project) => project.outcomes)
      .filter((outcome) => /migrations/i.test(outcome.label))
      .map((outcome) => outcome.value);
    expect(projectCounts.length).toBeGreaterThan(0);
    expect(new Set(projectCounts)).toEqual(
      new Set([String(MIGRATION_REGISTRY.length)])
    );
    expect(metrics.get("core_roles")!.value).toBe(
      String(PILLAR_CONTRACT.length)
    );
    expect(metrics.get("delivery_stages")!.value).toBe(
      String(draft.process.length)
    );
    const slugs = new Set(
      LAUNCH_CASE_STUDIES.map((study) => launchCaseStudySlug(study.key))
    );
    for (const metric of draft.metrics) {
      expect(metric.verification).toBe("derived");
      expect(metric.as_of).toBe(SEED_METRICS_AS_OF);
      if (metric.source_slug) expect(slugs.has(metric.source_slug)).toBe(true);
    }
  });
});

describe("seed version 8: deliverable samples", () => {
  const samples: Record<string, any>[] = draft.deliverable_samples;

  it("are derived from this repository and stay off until approved", () => {
    expect(samples.map((sample) => sample.key)).toEqual(
      expect.arrayContaining([
        "decision-record",
        "architecture-diagram",
        "runbook",
        "seed-dry-run",
      ])
    );
    for (const sample of samples) {
      expect(sample).toMatchObject({
        enabled: false,
        verification: "derived",
        source_label: "From this site's own repository",
      });
      expect(sample.excerpt.length).toBeLessThanOrEqual(1200);
      expect(sample.excerpt).not.toMatch(/[<]/);
    }
  });

  it("quote their source files verbatim", () => {
    const sources: Record<string, string> = {
      "decision-record":
        "docs/architecture/0008-migrations-and-audit-events.md",
      runbook: "docs/data/seeding.md",
    };
    for (const [key, path] of Object.entries(sources)) {
      const source = flat(readFileSync(path, "utf8"));
      const sample = samples.find((entry) => entry.key === key)!;
      for (const passage of sample.excerpt.split(SAMPLE_GAP)) {
        expect(source, `${key}: ${passage.slice(0, 60)}`).toContain(
          flat(passage.replace(/^ADR 0008/, "# ADR 0008"))
        );
      }
    }
  });

  it("render the diagram of the case study they point at", () => {
    const sample = samples.find(
      (entry) => entry.key === "architecture-diagram"
    )!;
    const study = LAUNCH_CASE_STUDIES.find(
      (entry) => entry.key === "migrations"
    )!;
    expect(sample.source_slug).toBe(launchCaseStudySlug("migrations"));
    for (const node of study.architecture.nodes) {
      if (
        study.architecture.edges.some(
          (edge) => edge.from === node.key || edge.to === node.key
        )
      ) {
        expect(sample.excerpt).toContain(node.label);
      }
    }
  });

  it("state the same number of creates as the manifest has records", () => {
    const sample = samples.find((entry) => entry.key === "seed-dry-run")!;
    expect(sample.excerpt).toContain(`"create": ${manifest.records.length}`);
    expect(sample.excerpt).toContain(
      `"seed_version": ${FOUNDATION_SEED_VERSION}`
    );
  });
});

describe("seed version 8: services and FAQs", () => {
  const services = manifest.records.filter(
    (entry) => entry.collection === "services"
  );
  const slugs = new Set(
    LAUNCH_CASE_STUDIES.map((study) => launchCaseStudySlug(study.key))
  );

  it("give each service at most five valid problems, seven in all", () => {
    expect(services).toHaveLength(3);
    let total = 0;
    for (const service of services) {
      const problems = service.payload.problems as {
        key: string;
        case_slug?: string;
      }[];
      total += problems.length;
      expect(problems.length).toBeGreaterThan(0);
      expect(new Set(problems.map((problem) => problem.key)).size).toBe(
        problems.length
      );
      for (const problem of problems) {
        if (problem.case_slug) expect(slugs.has(problem.case_slug)).toBe(true);
      }
      const parsed = createServiceSchema.safeParse({
        title: service.payload.title,
        outcome: service.payload.outcome,
        capabilities: service.payload.capabilities,
        problems,
      });
      expect(parsed.success, service.seed_key).toBe(true);
    }
    expect(total).toBe(7);
  });

  it("keeps the stance FAQs off and adds no answer that needs an unknown fact", () => {
    const faqs = manifest.records.filter(
      (entry) => entry.collection === "faqs"
    );
    const bySlug = new Map(
      faqs.map((faq) => [faq.payload.slug as string, faq.payload])
    );
    expect(bySlug.get("no-code-or-chatgpt")!.enabled).toBe(false);
    expect(bySlug.get("existing-code-or-team")!.enabled).toBe(false);
    expect(bySlug.get("ai-gets-it-wrong")!.enabled).toBe(true);
    // Cost, duration, ownership and time zones depend on unconfirmed owner facts (C-06, C-14 to C-17).
    for (const slug of bySlug.keys()) {
      expect(slug).not.toMatch(
        /cost|price|duration|how-long|ownership|owns|time-?zone/
      );
    }
  });
});

describe("seed version 8: Page compositions", () => {
  const sections = (route: string) =>
    (
      record(`page.${route}`).payload.draft as {
        sections: Record<string, any>[];
      }
    ).sections;

  it("compose the home chapters in the order of the plan", () => {
    const home = sections("home");
    expect(home.map((section) => section.kind)).toEqual([
      "site-hero",
      "metrics-strip",
      "pillar-showcase",
      "problem-index",
      "service-collection",
      "architecture-workflow",
      "case-study-collection",
      "deliverable-samples",
      "process-steps",
      "engagement-models",
      "fit-check",
      "starting-point",
      "skill-group-collection",
      "commitments",
      "testimonial-collection",
      "github-profile",
      "commitments",
      "article-collection",
      "faq-list",
      "contact-cta",
    ]);
    expect(home.length).toBeLessThanOrEqual(20);
    expect(
      home.filter((section) => !section.visible).map((section) => section.key)
    ).toEqual(["pillars"]);
    const layouts = Object.fromEntries(
      home.map((section) => [section.key, section.layout])
    );
    expect(layouts).toMatchObject({
      hero: "topology",
      metrics: "evidence",
      services: "stack",
      "architecture-workflow": "pipeline",
      "case-studies": "files",
      skills: "registry",
      process: "wire",
      principles: "principles",
      articles: "notes",
    });
    expect(home.find((section) => section.key === "articles")!.item_limit).toBe(
      3
    );
  });

  it("drops the sections the plan retires from the home draft", () => {
    const keys = sections("home").map((section) => section.key);
    for (const retired of ["projects", "videos", "reels"]) {
      expect(keys).not.toContain(retired);
    }
  });

  it("add the principles and the fit check to About, hidden", () => {
    const about = sections("about");
    for (const key of ["principles", "fit"]) {
      expect(about.find((section) => section.key === key)).toMatchObject({
        visible: false,
      });
    }
  });
});

describe("seed version 8: case-file diagrams", () => {
  it("cover the four launch case studies with constraints and a valid diagram", () => {
    expect(LAUNCH_CASE_STUDIES.map((study) => study.key)).toEqual([
      "publishing",
      "migrations",
      "contact-intake",
      "upkeep",
    ]);
    for (const study of LAUNCH_CASE_STUDIES) {
      const result = parseCaseStudyArchitecture(study.architecture);
      expect(result.ok, study.name).toBe(true);
      expect(study.constraints.length).toBeGreaterThan(0);
      expect(study.constraints.length).toBeLessThanOrEqual(6);

      const { nodes, edges, steps } = study.architecture;
      for (const node of nodes) {
        const connected = edges.some(
          (edge) => edge.from === node.key || edge.to === node.key
        );
        expect(connected, `${study.key}: ${node.key} has an edge`).toBe(true);
        const shown = steps.some((step) => step.focus.includes(node.key));
        expect(shown, `${study.key}: ${node.key} is in a step`).toBe(true);
      }
    }
  });

  it("still pass the Case study create schema", () => {
    for (const study of LAUNCH_CASE_STUDIES) {
      const parsed = createCaseStudySchema.safeParse({
        body: {
          name: study.name,
          category: "507f1f77bcf86cd799439011",
          description: study.description,
          engagement_type: "internal",
          primary_pillar: study.pillar,
          constraints: [...study.constraints],
          architecture: study.architecture,
          status: "draft",
        },
      });
      expect(parsed.success, study.name).toBe(true);
    }
  });
});
