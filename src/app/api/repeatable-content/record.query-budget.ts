export const REPEATABLE_QUERY_BUDGET = Object.freeze({
  max_limit: 50,
  max_page: 200,
  max_skip: 10_000,
  max_search_terms: 8,
  max_docs_examined_per_returned: 50,
});

type ExplainStage = Readonly<Record<string, unknown>>;

const hasCollectionScan = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.stage === "COLLSCAN") return true;
  return Object.values(record).some(hasCollectionScan);
};

export type TExplainBudgetResult = Readonly<{
  within_budget: boolean;
  reason?: "COLLECTION_SCAN" | "EXAMINED_RATIO" | "MALFORMED_EXPLAIN";
  docs_examined: number;
  returned: number;
}>;

/**
 * CI/integration checks feed Mongo `executionStats` output into this pure
 * evaluator. Empty collections are valid; populated primary shapes must use an
 * index and stay below the documented examined/returned ratio.
 */
export const assessRepeatableExplainPlan = (
  explain: ExplainStage
): TExplainBudgetResult => {
  const stats = explain.executionStats;
  if (!stats || typeof stats !== "object") {
    return {
      within_budget: false,
      reason: "MALFORMED_EXPLAIN",
      docs_examined: 0,
      returned: 0,
    };
  }
  const execution = stats as Record<string, unknown>;
  const docsExamined = Number(execution.totalDocsExamined);
  const returned = Number(execution.nReturned);
  if (!Number.isFinite(docsExamined) || !Number.isFinite(returned)) {
    return {
      within_budget: false,
      reason: "MALFORMED_EXPLAIN",
      docs_examined: 0,
      returned: 0,
    };
  }
  if (docsExamined > 0 && hasCollectionScan(execution.executionStages)) {
    return {
      within_budget: false,
      reason: "COLLECTION_SCAN",
      docs_examined: docsExamined,
      returned,
    };
  }
  const ratio = docsExamined / Math.max(1, returned);
  if (
    docsExamined > REPEATABLE_QUERY_BUDGET.max_limit &&
    ratio > REPEATABLE_QUERY_BUDGET.max_docs_examined_per_returned
  ) {
    return {
      within_budget: false,
      reason: "EXAMINED_RATIO",
      docs_examined: docsExamined,
      returned,
    };
  }
  return {
    within_budget: true,
    docs_examined: docsExamined,
    returned,
  };
};
