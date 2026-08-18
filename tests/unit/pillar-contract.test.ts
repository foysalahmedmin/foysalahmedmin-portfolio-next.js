import { createFoundationSeedManifest } from "@/lib/seed/foundation";
import {
  PILLAR_ACCENTS,
  PILLAR_CONTRACT,
  PILLAR_ICON_KEYS,
  PILLAR_KEYS,
} from "@/lib/content/pillars";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

const manifest = () =>
  createFoundationSeedManifest({
    _id: new ObjectId(),
    role: "super-admin" as const,
  });

type Record_ = {
  collection: string;
  payload: Record<string, unknown>;
};

const recordsIn = (collection: string): Record_[] =>
  (manifest().records as readonly Record_[]).filter(
    (record) => record.collection === collection
  );

describe("pillar contract", () => {
  it("publishes six disciplines with DevOps & Cloud before Full-Stack", () => {
    expect(PILLAR_CONTRACT).toHaveLength(6);
    expect(PILLAR_CONTRACT.map(({ key }) => key)).toEqual([
      "frontend",
      "backend",
      "ai_automation",
      "system_design",
      "devops_cloud",
      "full_stack",
    ]);
    expect(PILLAR_CONTRACT.map(({ order }) => order)).toEqual([
      1, 2, 3, 4, 5, 6,
    ]);
  });

  it("keeps every derived list aligned and free of duplicates", () => {
    const size = PILLAR_CONTRACT.length;
    expect(PILLAR_KEYS).toHaveLength(size);
    expect(PILLAR_ICON_KEYS).toHaveLength(size);
    expect(PILLAR_ACCENTS).toHaveLength(size);
    expect(new Set(PILLAR_KEYS).size).toBe(size);
    expect(new Set(PILLAR_ICON_KEYS).size).toBe(size);
    expect(new Set(PILLAR_ACCENTS).size).toBe(size);
    expect(
      new Set(PILLAR_CONTRACT.map(({ fallback_visual_key: key }) => key)).size
    ).toBe(size);
  });

  it("gives every pillar a seeded service, skill group, skills and hero", () => {
    const services = recordsIn("services");
    const groups = recordsIn("skill_groups");
    const skills = recordsIn("skills");
    const heroKeys = manifest().media.map(({ media_key: key }) => key);

    for (const { key } of PILLAR_CONTRACT) {
      expect(
        services.filter((record) => record.payload.primary_pillar === key)
      ).toHaveLength(1);
      expect(
        groups.filter((record) => record.payload.primary_pillar === key)
      ).toHaveLength(1);
      expect(
        skills.filter((record) => record.payload.primary_pillar === key).length
      ).toBeGreaterThan(0);
      expect(heroKeys).toContain(`hero.${key}`);
    }
  });
});
