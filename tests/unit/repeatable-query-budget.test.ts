import { describe, expect, it } from "vitest";
import {
  assessRepeatableExplainPlan,
  REPEATABLE_QUERY_BUDGET,
} from "@/app/api/repeatable-content/record.query-budget";

describe("repeatable-content explain-plan budget", () => {
  it("accepts indexed bounded primary query shapes", () => {
    expect(
      assessRepeatableExplainPlan({
        executionStats: {
          nReturned: 20,
          totalDocsExamined: 22,
          executionStages: { stage: "FETCH", inputStage: { stage: "IXSCAN" } },
        },
      })
    ).toMatchObject({ within_budget: true, docs_examined: 22, returned: 20 });
    expect(REPEATABLE_QUERY_BUDGET).toMatchObject({
      max_limit: 50,
      max_skip: 10_000,
    });
  });

  it("rejects populated collection scans and high examined ratios", () => {
    expect(
      assessRepeatableExplainPlan({
        executionStats: {
          nReturned: 20,
          totalDocsExamined: 100,
          executionStages: { stage: "COLLSCAN" },
        },
      })
    ).toMatchObject({ within_budget: false, reason: "COLLECTION_SCAN" });
    expect(
      assessRepeatableExplainPlan({
        executionStats: {
          nReturned: 1,
          totalDocsExamined: 100,
          executionStages: { stage: "FETCH", inputStage: { stage: "IXSCAN" } },
        },
      })
    ).toMatchObject({ within_budget: false, reason: "EXAMINED_RATIO" });
  });

  it("fails closed for malformed explain output", () => {
    expect(assessRepeatableExplainPlan({})).toMatchObject({
      within_budget: false,
      reason: "MALFORMED_EXPLAIN",
    });
  });
});
