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
  it("presents three client-facing roles in a fixed order", () => {
    expect(PILLAR_CONTRACT.map(({ key, label }) => [key, label])).toEqual([
      ["system_architect", "System Architect"],
      ["software_developer", "Software Developer"],
      ["ai_automation", "AI Automation Developer"],
    ]);
    expect(PILLAR_CONTRACT.map(({ order }) => order)).toEqual([1, 2, 3]);
  });

  it("keeps every derived list aligned and free of duplicates", () => {
    const size = PILLAR_CONTRACT.length;
    expect(PILLAR_KEYS).toHaveLength(size);
    expect(PILLAR_ICON_KEYS).toHaveLength(size);
    expect(new Set(PILLAR_KEYS).size).toBe(size);
    expect(new Set(PILLAR_ICON_KEYS).size).toBe(size);
    expect(
      new Set(PILLAR_CONTRACT.map(({ fallback_visual_key: key }) => key)).size
    ).toBe(size);

    // Accents are a shared palette with a design token each, so a pillar must
    // use a known one and no two pillars may share it.
    const accents = PILLAR_CONTRACT.map(({ default_accent: accent }) => accent);
    expect(new Set(accents).size).toBe(size);
    for (const accent of accents) expect(PILLAR_ACCENTS).toContain(accent);
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
