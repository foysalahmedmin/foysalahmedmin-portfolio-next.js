import { PILLAR_CONTRACT } from "@/lib/content/pillars";
import { createDemoSeedManifest, validateSeedManifest } from "@/lib/seed";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

const actor = { _id: new ObjectId(), role: "super-admin" as const };
const manifest = () => createDemoSeedManifest(actor);

type Record_ = {
  collection: string;
  seed_key: string;
  payload: Record<string, unknown>;
};

const recordsIn = (collection: string): Record_[] =>
  (manifest().records as readonly Record_[]).filter(
    (record) => record.collection === collection
  );

describe("demo seed manifest", () => {
  it("stays a valid, non-production, synthetic manifest", () => {
    const validated = validateSeedManifest(manifest());
    expect(validated.mode).toBe("demo");
    expect(validated.truth).toMatchObject({
      synthetic: true,
      publication_policy: "non_production_only",
    });
  });

  it("covers every pillar with a project and an article", () => {
    const projects = recordsIn("projects");
    const articles = recordsIn("articles");

    expect(projects).toHaveLength(PILLAR_CONTRACT.length);
    expect(articles).toHaveLength(PILLAR_CONTRACT.length);

    for (const { key } of PILLAR_CONTRACT) {
      expect(
        projects.some((record) => record.payload.primary_pillar === key)
      ).toBe(true);
      expect(
        articles.some((record) => record.payload.primary_pillar === key)
      ).toBe(true);
    }
  });

  it("labels every fixture as demo content so it can never pass as real work", () => {
    for (const record of manifest().records as readonly Record_[]) {
      const label = String(record.payload.name ?? record.payload.title ?? "");
      expect(label.startsWith("Demo")).toBe(true);
    }
  });

  it("supplies the categories its projects and articles reference", () => {
    const projectCategoryIds = new Set(
      recordsIn("project_categories").map((record) =>
        String(record.payload._id)
      )
    );
    const articleCategoryIds = new Set(
      recordsIn("article_categories").map((record) =>
        String(record.payload._id)
      )
    );
    expect(projectCategoryIds.size).toBeGreaterThan(0);
    expect(articleCategoryIds.size).toBeGreaterThan(0);

    for (const record of recordsIn("projects")) {
      expect(projectCategoryIds).toContain(String(record.payload.category));
    }
    for (const record of recordsIn("articles")) {
      expect(articleCategoryIds).toContain(String(record.payload.category));
    }
  });
});
