import {
  createEmergencyPublicSite,
  createNeutralSiteDraft,
  getSitePublishIssues,
  isSiteMetricFresh,
} from "@/app/api/site/site.policy";
import type { TSiteEngagementModel } from "@/app/api/site/site.type";
import { siteDraftSnapshotSchema } from "@/app/api/site/site.validation";
import { buildPublishableSiteDraft } from "../helpers/site-fixture";
import { describe, expect, it } from "vitest";

const model = (
  patch: Partial<TSiteEngagementModel> = {}
): TSiteEngagementModel => ({
  key: "review",
  name: "Architecture review",
  best_when: "A system is hurting.",
  you_get: ["Written architecture"],
  how_it_runs: "Fixed scope.",
  verification: "derived",
  enabled: true,
  ...patch,
});

describe("Phase 4 Site content contract", () => {
  it("fills empty defaults for a legacy snapshot and does not change its publish issues", () => {
    const legacy = structuredClone(buildPublishableSiteDraft()) as Record<
      string,
      unknown
    >;
    for (const key of [
      "engagement_models",
      "commitments",
      "deliverable_samples",
      "next_steps",
      "fit",
      "principles",
      "finder",
    ]) {
      delete legacy[key];
    }

    const parsed = siteDraftSnapshotSchema.parse(legacy);

    expect(parsed.engagement_models).toEqual([]);
    expect(parsed.fit).toEqual({
      enabled: false,
      segments: [],
      not_a_fit: [],
    });
    expect(parsed.finder.enabled).toBe(false);
    expect(parsed.workflow_example).toBeUndefined();
    expect(getSitePublishIssues(parsed)).toEqual([]);
    expect(createEmergencyPublicSite().engagement_models).toEqual([]);
    expect(createNeutralSiteDraft().principles).toEqual([]);
  });

  it("blocks unverified or incomplete engagement models and unverified prices at publish", () => {
    const draft = buildPublishableSiteDraft();
    draft.engagement_models = [
      model({ verification: "unverified" }),
      model({ key: "partial", best_when: undefined, you_get: [] }),
      model({ key: "priced", price_label: "From 1,000" }),
      model({ key: "off", verification: "unverified", enabled: false }),
    ];

    expect(siteDraftSnapshotSchema.safeParse(draft).success).toBe(true);
    const issues = getSitePublishIssues(draft);
    expect(issues).toEqual(
      expect.arrayContaining([
        "engagement_models.0.verification",
        "engagement_models.1.best_when",
        "engagement_models.1.you_get",
        "engagement_models.2.price_label",
      ])
    );
    expect(
      issues.filter((issue) => issue.startsWith("engagement_models.3"))
    ).toEqual([]);

    draft.engagement_models = [
      model({
        key: "priced",
        price_label: "From 1,000",
        verification: "verified",
      }),
    ];
    expect(getSitePublishIssues(draft)).toEqual([]);
  });

  it("validates limits, plain text and cross-references of the new lists", () => {
    const base = buildPublishableSiteDraft();
    const parse = (patch: Record<string, unknown>) =>
      siteDraftSnapshotSchema.safeParse({ ...base, ...patch }).success;

    expect(
      parse({
        positioning: { ...base.positioning, headline: "x".repeat(91) },
      })
    ).toBe(false);
    expect(
      parse({
        engagement_models: Array.from({ length: 5 }, (_, i) =>
          model({ key: `m${i}` })
        ),
      })
    ).toBe(false);
    expect(parse({ engagement_models: [model(), model()] })).toBe(false);
    expect(parse({ engagement_models: [model({ name: "<b>Bold</b>" })] })).toBe(
      false
    );

    const sample = {
      key: "adr",
      title: "Decision record",
      kind: "decision_record",
      excerpt: "Context\n\nDecision: keep one writer.",
      source_label: "From this site's own repository",
      verification: "derived",
      enabled: false,
    };
    expect(parse({ deliverable_samples: [sample] })).toBe(true);
    expect(
      parse({
        deliverable_samples: [{ ...sample, excerpt: "a".repeat(1_201) }],
      })
    ).toBe(false);
    expect(
      parse({
        deliverable_samples: [{ ...sample, excerpt: "<script>x</script>" }],
      })
    ).toBe(false);

    const workflow = {
      title: "Pipeline",
      caption: "An illustrative flow.",
      illustrative: true,
      nodes: [
        {
          key: "in",
          kind: "input",
          label: "Input",
          summary: "A request arrives.",
        },
        { key: "out", kind: "output", label: "Output", summary: "Work lands." },
      ],
    };
    expect(parse({ workflow_example: workflow })).toBe(true);
    expect(
      parse({ workflow_example: { ...workflow, illustrative: false } })
    ).toBe(false);
    expect(
      parse({ workflow_example: { ...workflow, nodes: [workflow.nodes[0]] } })
    ).toBe(false);
    expect(
      parse({
        metrics: [
          {
            key: "m",
            label: "M",
            verification: "derived",
            enabled: false,
            as_of: "2026-13-40",
          },
        ],
      })
    ).toBe(false);
  });

  it("requires an enabled finder to point at offered models and known tags", () => {
    const draft = buildPublishableSiteDraft();
    draft.engagement_models = [model({ key: "build" })];
    draft.finder = {
      enabled: true,
      steps: [
        {
          key: "now",
          question: "Where are you now?",
          options: [
            { key: "idea", label: "An idea", tags: ["idea"] },
            { key: "growing", label: "Growing", tags: ["growing"] },
          ],
        },
      ],
      outcomes: [
        {
          engagement_key: "build",
          when_tags: ["idea"],
          reasoning: "Start small.",
        },
        {
          engagement_key: "missing",
          when_tags: ["idea"],
          reasoning: "No such model.",
        },
        {
          engagement_key: "build",
          when_tags: ["unknown"],
          reasoning: "Unknown tag.",
        },
      ],
    };

    expect(getSitePublishIssues(draft)).toEqual(
      expect.arrayContaining([
        "finder.outcomes.1.engagement_key",
        "finder.outcomes.2.when_tags",
      ])
    );
    expect(getSitePublishIssues(draft)).not.toContain(
      "finder.outcomes.0.engagement_key"
    );

    draft.fit = { enabled: true, segments: [], not_a_fit: [] };
    expect(getSitePublishIssues(draft)).toContain("fit.segments");
  });

  it("hides a measured value 180 days after its as_of date", () => {
    const now = new Date("2026-11-04T00:00:00Z");

    expect(isSiteMetricFresh(undefined, now)).toBe(true);
    expect(isSiteMetricFresh("2026-05-08", now)).toBe(true);
    expect(isSiteMetricFresh("2026-05-07", now)).toBe(false);
  });
});
