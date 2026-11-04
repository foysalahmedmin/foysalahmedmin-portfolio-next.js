import { createFoundationSeedManifest } from "@/lib/seed";
import { readFileSync } from "node:fs";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

type Claim = {
  id: string;
  category: string;
  status: string;
  production_publish: string;
  derivation_rule?: string;
  sources: { path: string }[];
  [key: string]: unknown;
};

const read = (path: string) => JSON.parse(readFileSync(path, "utf8"));
const schema = read("docs/content/content-truth.schema.json");
const truth = read("docs/content/content-truth.v1.json");
const claims: Claim[] = truth.claims;
const claimIds = new Set(claims.map((claim) => claim.id));

const manifest = createFoundationSeedManifest({
  _id: new ObjectId(),
  role: "super-admin",
});
const site = manifest.records.find(
  (record) => record.seed_key === "site.primary"
)!;
const draft = site.payload.draft as Record<string, any>;

describe("content truth manifest", () => {
  const claimSchema = schema.$defs.claim;

  it("matches the schema it declares", () => {
    expect(truth.schema_version).toBe(schema.properties.schema_version.const);
    expect(truth.manifest_version).toMatch(
      new RegExp(schema.properties.manifest_version.pattern)
    );
    expect(truth.manifest_version).toBe("1.1.0");
    expect(Object.keys(truth).sort()).toEqual(
      [...schema.required, "$schema"].sort()
    );
    expect(truth.audit.audited_at).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("holds well-formed, unique claims", () => {
    expect(claimIds.size).toBe(claims.length);
    const idPattern = new RegExp(claimSchema.properties.id.pattern);
    for (const claim of claims) {
      expect(Object.keys(claim).sort(), claim.id).toEqual(
        expect.arrayContaining([...claimSchema.required])
      );
      for (const key of Object.keys(claim)) {
        expect(
          Object.keys(claimSchema.properties),
          `${claim.id}.${key}`
        ).toContain(key);
      }
      expect(claim.id).toMatch(idPattern);
      expect(claimSchema.properties.category.enum).toContain(claim.category);
      expect(schema.$defs.truthStatus.enum).toContain(claim.status);
      expect(schema.$defs.publishGate.enum).toContain(claim.production_publish);
      expect(claim.sources.length).toBeGreaterThan(0);
      if (claim.status === "dynamic-derived") {
        expect(claim.production_publish, claim.id).toBe("derive-only");
        expect(claim.derivation_rule, claim.id).toBeTruthy();
      }
      if (["needs-owner-verification", "remove"].includes(claim.status)) {
        expect(claim.production_publish, claim.id).toBe("block");
      }
    }
  });

  it("registers the Site fields of seed version 8", () => {
    const added = claims.filter((claim) => claim.id.startsWith("site."));
    expect(added.length).toBeGreaterThanOrEqual(21);
    for (const id of [
      "site.positioning-headline",
      "site.commitments",
      "site.principles",
      "site.workflow-example",
      "site.next-steps",
      "site.fit-check",
      "site.finder",
      "site.working-hours",
    ]) {
      expect(claimIds.has(id), id).toBe(true);
    }
    for (const claim of added.filter((entry) =>
      entry.id.startsWith("site.metric.")
    )) {
      expect(claim.status).toBe("dynamic-derived");
      expect(String(claim.derivation_rule)).toMatch(/180 days/);
    }
    for (const claim of added.filter((entry) =>
      /^site\.(engagement-model|deliverable-sample)\./.test(entry.id)
    )) {
      expect(claim.status, claim.id).toBe("needs-owner-verification");
    }
  });
});

describe("content gate for the seeded Site", () => {
  const claimFor = {
    metrics: (key: string) => `site.metric.${key}`,
    engagement_models: (key: string) => `site.engagement-model.${key}`,
    deliverable_samples: (key: string) => `site.deliverable-sample.${key}`,
  } as const;

  it("backs every enabled, not-unverified record with a claim", () => {
    for (const [field, claimId] of Object.entries(claimFor)) {
      for (const record of draft[field] as {
        key: string;
        enabled: boolean;
        verification: string;
      }[]) {
        if (record.enabled && record.verification !== "unverified") {
          expect(
            claimIds.has(claimId(record.key)),
            `${field}.${record.key}`
          ).toBe(true);
        }
      }
    }
  });

  it("registers every keyed record, enabled or not", () => {
    for (const [field, claimId] of Object.entries(claimFor)) {
      for (const record of draft[field] as { key: string }[]) {
        expect(
          claimIds.has(claimId(record.key)),
          `${field}.${record.key}`
        ).toBe(true);
      }
    }
  });

  it("backs each enabled group of statements with a claim", () => {
    const groups = {
      commitments: "site.commitments",
      principles: "site.principles",
      next_steps: "site.next-steps",
    } as const;
    for (const [field, claimId] of Object.entries(groups)) {
      expect((draft[field] as unknown[]).length).toBeGreaterThan(0);
      expect(claimIds.has(claimId), claimId).toBe(true);
    }
    expect(claimIds.has("site.workflow-example")).toBe(true);
    expect(claimIds.has("site.fit-check")).toBe(true);
    expect(claimIds.has("site.finder")).toBe(true);
    expect(claimIds.has("site.positioning-headline")).toBe(true);
  });

  it("never seeds an unverified value as enabled and verified", () => {
    for (const metric of draft.metrics) {
      if (metric.enabled) expect(metric.verification).not.toBe("unverified");
    }
    for (const model of draft.engagement_models) {
      expect(model.enabled && model.verification === "unverified").toBe(false);
    }
  });

  it("contains no placeholder or open-question marker in any seeded public text", () => {
    const publicRecords = manifest.records.filter((record) =>
      ["sites", "pages", "services", "faqs", "skill_groups", "skills"].includes(
        record.collection
      )
    );
    expect(publicRecords.length).toBeGreaterThan(0);
    for (const record of publicRecords) {
      expect(JSON.stringify(record.payload), record.seed_key).not.toMatch(
        /\[CONFIRM|TODO|\[Placeholder/i
      );
    }
  });
});
