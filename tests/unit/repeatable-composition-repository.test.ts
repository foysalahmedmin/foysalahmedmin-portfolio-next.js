import { beforeEach, describe, expect, it, vi } from "vitest";
import { createRecordRepository } from "@/app/api/repeatable-content/record.repository";

const state = {
  filter: {} as Record<string, unknown>,
  limit: 0,
  options: {} as Record<string, unknown>,
};

const query = () => {
  const chain = {
    setOptions: vi.fn((options: Record<string, unknown>) => {
      state.options = options;
      return chain;
    }),
    select: vi.fn(() => chain),
    populate: vi.fn(() => chain),
    sort: vi.fn(() => chain),
    limit: vi.fn((limit: number) => {
      state.limit = limit;
      return chain;
    }),
    lean: vi.fn(async () => [
      {
        _id: "507f1f77bcf86cd799439021",
        slug: "nodejs",
        group: { slug: "backend" },
      },
    ]),
  };
  return chain;
};

const find = vi.fn((filter: Record<string, unknown>) => {
  state.filter = filter;
  return query();
});

const repository = createRecordRepository({
  domain: "skill",
  model: { find } as never,
  public_filter: { claim_verification: { $in: ["derived", "verified"] } },
  public_fields: ["group"],
  public_populates: [],
  file_fields: [],
  filter_rules: {
    group: { field: "group", kind: "object_id", public: false },
  },
} as never);

describe("trusted related composition repository", () => {
  beforeEach(() => {
    find.mockClear();
    state.filter = {};
    state.limit = 0;
    state.options = {};
  });

  it("uses one exact-active, public-only, bounded relation query", async () => {
    const result = await repository.findPublicForRelatedComposition({
      relation_filter: "group",
      relation_ids: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
      limit: 999,
    });

    expect(find).toHaveBeenCalledOnce();
    expect(state.filter).toEqual({
      locale: "en",
      status: "published",
      enabled: true,
      published_at: { $lte: expect.any(Date) },
      claim_verification: { $in: ["derived", "verified"] },
      group: {
        $in: ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
      },
    });
    expect(state.options).toMatchObject({
      softDeleteScope: "active",
      softDeleteExactActive: true,
    });
    expect(state.limit).toBe(24);
    expect(result).toHaveLength(1);
  });

  it("rejects arbitrary relation fields and IDs without issuing a query", async () => {
    await expect(
      repository.findPublicForRelatedComposition({
        relation_filter: "$where",
        relation_ids: ["not-an-object-id"],
        limit: 24,
      })
    ).rejects.toThrow("PUBLIC_COMPOSITION_RELATION_INVALID");
    expect(find).not.toHaveBeenCalled();
  });
});
