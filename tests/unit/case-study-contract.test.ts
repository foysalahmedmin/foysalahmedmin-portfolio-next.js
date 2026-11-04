import "@/app/api/case-studies/case-study.model";
import {
  createCaseStudySchema,
  updateCaseStudyByIdSchema,
} from "@/app/api/case-studies/case-study.validation";
import {
  CASE_STUDY_ENGAGEMENT_TYPES,
  getCaseStudyPublishReadiness,
  getCaseStudyPublishRecommendations,
  parseCaseStudyArchitecture,
} from "@/lib/content/case-study-contract";
import { PROJECT_TYPES } from "@/lib/content/portfolio-contract";
import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

const complete = {
  description: "A short summary.",
  primary_pillar: "software_developer" as const,
  engagement_type: "internal" as const,
  challenge: "The problem.",
  approach: "The approach.",
  solution: "The solution.",
  results_summary: "What changed.",
};

describe("case study publish readiness", () => {
  it("shares its engagement vocabulary with Projects", () => {
    expect([...CASE_STUDY_ENGAGEMENT_TYPES]).toEqual([...PROJECT_TYPES]);
  });

  it("accepts a complete story", () => {
    expect(getCaseStudyPublishReadiness(complete)).toEqual([]);
  });

  it("accepts a derived outcome instead of a results summary", () => {
    expect(
      getCaseStudyPublishReadiness({
        ...complete,
        results_summary: "",
        outcomes: [
          { label: "Retries", value: "5", verification_state: "derived" },
        ],
      })
    ).toEqual([]);
  });

  it("does not count unverified outcomes as a result", () => {
    expect(
      getCaseStudyPublishReadiness({
        ...complete,
        results_summary: "  ",
        outcomes: [
          { label: "Claim", value: "10x", verification_state: "unverified" },
        ],
      })
    ).toEqual(["results"]);
  });

  it("lists every missing field in a stable order", () => {
    expect(getCaseStudyPublishReadiness({})).toEqual([
      "description",
      "primary_pillar",
      "engagement_type",
      "challenge",
      "approach",
      "solution",
      "results",
    ]);
  });
});

const architecture = {
  alt: "Request flow from the browser to the database",
  layers: ["Edge", "Core"],
  nodes: [
    { key: "browser", label: "Browser", layer: "Edge", kind: "client" },
    {
      key: "api",
      label: "API",
      layer: "Core",
      kind: "service",
      note: "Validates",
    },
    { key: "db", label: "Database", layer: "Core", kind: "data" },
  ],
  edges: [
    { from: "browser", to: "api", label: "HTTPS" },
    { from: "api", to: "db" },
  ],
  steps: [{ title: "Write path", focus: ["api", "db"] }],
};
const mutate = (change: (draft: typeof architecture) => void) => {
  const draft = structuredClone(architecture);
  change(draft);
  return draft;
};
const body = { name: "Story", category: "507f1f77bcf86cd799439011" };
const firstIssuePath = (input: unknown) => {
  const result = parseCaseStudyArchitecture(input);
  return result.ok ? null : result.issues[0]!.path;
};

describe("case study architecture contract", () => {
  it("accepts a valid diagram and returns a trimmed copy", () => {
    const result = parseCaseStudyArchitecture(
      mutate((d) => {
        d.nodes[0]!.label = "  Browser  ";
      })
    );
    expect(result.ok && result.value.nodes[0]!.label).toBe("Browser");
    expect(
      parseCaseStudyArchitecture({ ...architecture, edges: [], steps: [] }).ok
    ).toBe(true);
  });

  it.each([
    [
      "a bad layer",
      (d: typeof architecture) => void (d.nodes[1]!.layer = "Nowhere"),
      ["nodes", 1, "layer"],
    ],
    [
      "a dangling edge",
      (d: typeof architecture) => void (d.edges[0]!.to = "ghost"),
      ["edges", 0, "to"],
    ],
    [
      "a self edge",
      (d: typeof architecture) =>
        void (d.edges[1] = { from: "api", to: "api" }),
      ["edges", 1, "to"],
    ],
    [
      "a duplicate edge",
      (d: typeof architecture) =>
        void d.edges.push({ from: "browser", to: "api" }),
      ["edges", 2],
    ],
    [
      "an unknown focus key",
      (d: typeof architecture) => void (d.steps[0]!.focus = ["api", "ghost"]),
      ["steps", 0, "focus", 1],
    ],
    [
      "an empty focus",
      (d: typeof architecture) => void (d.steps[0]!.focus = []),
      ["steps", 0, "focus"],
    ],
    [
      "a duplicate node key",
      (d: typeof architecture) => void (d.nodes[2]!.key = "api"),
      ["nodes", 2, "key"],
    ],
    [
      "a duplicate layer",
      (d: typeof architecture) => void (d.layers[1] = "Edge"),
      ["layers", 1],
    ],
    [
      "an unknown kind",
      (d: typeof architecture) =>
        void ((d.nodes[0] as { kind: string }).kind = "database"),
      ["nodes", 0, "kind"],
    ],
    [
      "markup in a label",
      (d: typeof architecture) => void (d.nodes[0]!.label = "<b>Browser</b>"),
      ["nodes", 0, "label"],
    ],
    [
      "a script scheme in a note",
      (d: typeof architecture) => void (d.nodes[1]!.note = "javascript:run()"),
      ["nodes", 1, "note"],
    ],
    [
      "a short alt text",
      (d: typeof architecture) => void (d.alt = "short"),
      ["alt"],
    ],
    [
      "an unknown field",
      (d: typeof architecture) => void Object.assign(d, { svg: "<svg/>" }),
      ["svg"],
    ],
    [
      "too many nodes",
      (d: typeof architecture) =>
        void (d.nodes = Array.from({ length: 25 }, (_, i) => ({
          key: `n${i}`,
          label: "N",
          layer: "Edge",
          kind: "client",
        }))),
      ["nodes"],
    ],
  ])("rejects %s and reports its path", (_name, change, path) => {
    expect(firstIssuePath(mutate(change))).toEqual(path);
  });

  it.each([null, "text", [], {}])(
    "rejects the non-diagram value %j",
    (value) => {
      expect(parseCaseStudyArchitecture(value).ok).toBe(false);
    }
  );

  it("recommends, but never requires, constraints and architecture", () => {
    expect(getCaseStudyPublishRecommendations({})).toEqual([
      "constraints",
      "architecture",
    ]);
    expect(
      getCaseStudyPublishRecommendations({
        constraints: [" "],
        architecture: null,
      })
    ).toEqual(["constraints", "architecture"]);
    expect(
      getCaseStudyPublishRecommendations({ constraints: ["One"], architecture })
    ).toEqual([]);
    expect(
      getCaseStudyPublishReadiness({
        ...complete,
        constraints: [],
        architecture: null,
      })
    ).toEqual([]);
  });
});

describe("case study constraints and architecture schemas", () => {
  const parse = (extra: Record<string, unknown>) =>
    createCaseStudySchema.safeParse({ body: { ...body, ...extra } });

  it("keeps validating a case study without the new fields", () => {
    const result = parse({});
    expect(result.success).toBe(true);
    expect(result.success && result.data.body).not.toHaveProperty(
      "constraints"
    );
    expect(result.success && result.data.body).not.toHaveProperty(
      "architecture"
    );
  });

  it.each([
    ["six short constraints", Array.from({ length: 6 }, () => "x"), true],
    ["seven constraints", Array.from({ length: 7 }, () => "x"), false],
    ["a 300 character constraint", ["x".repeat(300)], true],
    ["a 301 character constraint", ["x".repeat(301)], false],
    ["an empty constraint", [""], false],
  ])("constraints: %s", (_name, constraints, ok) => {
    expect(parse({ constraints }).success).toBe(ok);
  });

  it("validates architecture on create and update, and lets update clear it", () => {
    expect(parse({ architecture }).success).toBe(true);
    const bad = parse({
      architecture: mutate((d) => void (d.edges[0]!.to = "ghost")),
    });
    expect(!bad.success && bad.error.issues[0]!.path).toEqual([
      "body",
      "architecture",
      "edges",
      0,
      "to",
    ]);
    const update = (extra: Record<string, unknown>) =>
      updateCaseStudyByIdSchema.safeParse({
        params: { id: "507f1f77bcf86cd799439011" },
        body: extra,
      });
    expect(update({ architecture }).success).toBe(true);
    expect(update({ architecture: null }).success).toBe(true);
    expect(update({ constraints: [] }).success).toBe(true);
  });

  it("validates the stored diagram at the model", async () => {
    const CaseStudy = mongoose.models.CaseStudy!;
    const errors = async (value: unknown) =>
      Object.keys(
        (
          await new CaseStudy({ ...body, architecture: value })
            .validate()
            .catch((e) => e)
        )?.errors ?? {}
      ).filter((path) => path.startsWith("architecture"));
    expect(await errors(architecture)).toEqual([]);
    expect(
      await errors(mutate((d) => void (d.edges[0]!.to = "ghost")))
    ).toEqual(["architecture"]);
    expect(new CaseStudy(body).toObject()).not.toHaveProperty("architecture");
  });
});
