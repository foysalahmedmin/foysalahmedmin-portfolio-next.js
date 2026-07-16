import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  connectDB: vi.fn(),
  findGroups: vi.fn(),
  findSkills: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ default: mocks.connectDB }));
vi.mock("@/app/api/repeatable-content/record.service", () => ({
  createRecordService: vi.fn(() => ({})),
}));
vi.mock("@/app/api/skill-groups/skill-group.repository", () => ({
  SkillGroupRepository: {
    findPublicForComposition: mocks.findGroups,
  },
}));
vi.mock("@/app/api/skills/skill.repository", () => ({
  SkillRepository: {
    findPublicForRelatedComposition: mocks.findSkills,
  },
}));

import {
  PAGE_COMPOSITION_SKILL_LIMIT,
  getPublicSkillGroupsForComposition,
} from "@/app/api/skill-groups/skill-group.service";

const base = (input: Record<string, unknown>) => ({
  locale: "en",
  summary: "Public summary",
  secondary_pillars: [],
  sequence: 1,
  is_featured: true,
  published_at: new Date("2026-07-15T00:00:00.000Z"),
  ...input,
});

describe("SkillGroup Page composition", () => {
  beforeEach(() => {
    mocks.connectDB.mockReset();
    mocks.connectDB.mockResolvedValue(undefined);
    mocks.findGroups.mockReset();
    mocks.findSkills.mockReset();
  });

  it("joins bounded, trust-eligible public Skill DTOs without leaking evidence", async () => {
    mocks.findGroups.mockResolvedValue([
      base({
        _id: "507f1f77bcf86cd799439012",
        slug: "backend",
        title: "Backend",
        description: "Backend systems",
        primary_pillar: "backend",
      }),
      base({
        _id: "507f1f77bcf86cd799439011",
        slug: "frontend",
        title: "Frontend",
        description: "Frontend systems",
        primary_pillar: "frontend",
      }),
      base({
        _id: "507f1f77bcf86cd799439013",
        slug: "automation",
        title: "AI automation",
        description: "Automation systems",
        primary_pillar: "ai-automation",
      }),
    ]);
    mocks.findSkills.mockResolvedValue([
      base({
        _id: "507f1f77bcf86cd799439021",
        slug: "nodejs",
        title: "Node.js",
        primary_pillar: "backend",
        group: {
          slug: "backend",
          title: "Backend",
          primary_pillar: "backend",
        },
        proficiency_level: "advanced",
        claim_verification: "derived",
        keywords: ["runtime"],
        evidence_reference: "private-work-history",
      }),
      base({
        _id: "507f1f77bcf86cd799439022",
        slug: "react",
        title: "React",
        primary_pillar: "frontend",
        group: {
          slug: "frontend",
          title: "Frontend",
          primary_pillar: "frontend",
        },
        proficiency_level: "advanced",
        claim_verification: "verified",
        keywords: ["ui"],
        evidence_reference: "private-project-id",
      }),
      base({
        _id: "507f1f77bcf86cd799439023",
        slug: "mismatched",
        title: "Mismatched claim",
        primary_pillar: "frontend",
        group: {
          slug: "backend",
          title: "Backend",
          primary_pillar: "backend",
        },
        proficiency_level: "expert",
        claim_verification: "verified",
        keywords: [],
      }),
    ]);

    const result = await getPublicSkillGroupsForComposition({
      limit: 5,
      filters: { featured: true },
    });

    expect(mocks.findGroups).toHaveBeenCalledWith({
      limit: 5,
      filters: { featured: true },
    });
    expect(mocks.findSkills).toHaveBeenCalledWith({
      relation_filter: "group",
      relation_ids: [
        "507f1f77bcf86cd799439012",
        "507f1f77bcf86cd799439011",
        "507f1f77bcf86cd799439013",
      ],
      limit: PAGE_COMPOSITION_SKILL_LIMIT,
    });
    expect(result.map(({ slug }) => slug)).toEqual(["backend", "frontend"]);
    expect(result[0]?.skills.map(({ slug }) => slug)).toEqual(["nodejs"]);
    expect(result[1]?.skills.map(({ slug }) => slug)).toEqual(["react"]);
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("evidence_reference");
    expect(serialized).not.toContain("private-work-history");
    expect(serialized).not.toContain("507f1f77bcf86cd799439021");
    expect(serialized).not.toContain("claim_verification");
  });

  it("rejects malformed or duplicate curated IDs before database access", async () => {
    await expect(
      getPublicSkillGroupsForComposition({
        ids: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439011"],
        limit: 2,
        filters: {},
      })
    ).rejects.toMatchObject({ code: "CONTENT_COMPOSITION_INPUT_INVALID" });
    expect(mocks.connectDB).not.toHaveBeenCalled();
    expect(mocks.findGroups).not.toHaveBeenCalled();
  });
});
