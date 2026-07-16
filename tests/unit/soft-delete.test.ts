import {
  getSoftDeleteAggregateInsertionIndex,
  getSoftDeleteFilter,
  parseSoftDeleteScope,
} from "@/lib/db/soft-delete";
import type { PipelineStage } from "mongoose";
import { describe, expect, it } from "vitest";

describe("soft-delete scopes", () => {
  it("accepts only documented scope values and fails closed", () => {
    expect(parseSoftDeleteScope("active")).toBe("active");
    expect(parseSoftDeleteScope("with_deleted")).toBe("with_deleted");
    expect(parseSoftDeleteScope("only_deleted")).toBe("only_deleted");
    expect(parseSoftDeleteScope("all")).toBe("active");
    expect(parseSoftDeleteScope({ $ne: "active" })).toBe("active");
  });

  it.each([
    ["active", { is_deleted: { $ne: true } }],
    ["only_deleted", { is_deleted: true }],
    ["with_deleted", {}],
  ] as const)("maps %s to its enforced database filter", (scope, filter) => {
    expect(getSoftDeleteFilter(scope)).toEqual(filter);
  });

  it("supports an explicit exact-active predicate for partial indexes", () => {
    expect(getSoftDeleteFilter("active", { exact_active: true })).toEqual({
      is_deleted: false,
    });
  });

  it.each(["$geoNear", "$search", "$searchMeta", "$vectorSearch"])(
    "keeps required-first %s stages at index zero",
    (operator) => {
      const pipeline = [
        { [operator]: {} },
        { $project: { name: 1 } },
      ] as unknown as PipelineStage[];

      expect(getSoftDeleteAggregateInsertionIndex(pipeline)).toBe(1);
    }
  );

  it("places the visibility match first for ordinary pipelines", () => {
    expect(
      getSoftDeleteAggregateInsertionIndex([{ $project: { name: 1 } }])
    ).toBe(0);
  });
});
