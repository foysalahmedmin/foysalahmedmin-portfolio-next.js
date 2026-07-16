import type { Aggregate, PipelineStage, Query, Schema } from "mongoose";

export const SOFT_DELETE_SCOPES = [
  "active",
  "with_deleted",
  "only_deleted",
] as const;

export type SoftDeleteScope = (typeof SOFT_DELETE_SCOPES)[number];

export const parseSoftDeleteScope = (value: unknown): SoftDeleteScope =>
  typeof value === "string" &&
  SOFT_DELETE_SCOPES.includes(value as SoftDeleteScope)
    ? (value as SoftDeleteScope)
    : "active";

type SoftDeleteOptions = {
  softDeleteScope?: SoftDeleteScope;
  softDeleteExactActive?: boolean;
};

type SoftDeleteQuery = Query<unknown, unknown> & {
  options: SoftDeleteOptions & Record<string, unknown>;
};

type SoftDeleteAggregate = Aggregate<unknown[]> & {
  options: SoftDeleteOptions & Record<string, unknown>;
};

type SoftDeleteScopeQuery = {
  setOptions(options: SoftDeleteOptions): unknown;
};

type SoftDeleteScopeAggregate = {
  option(options: SoftDeleteOptions): unknown;
};

const REQUIRED_FIRST_AGGREGATE_STAGES = new Set([
  "$geoNear",
  "$search",
  "$searchMeta",
  "$vectorSearch",
]);

const STAGE_NATIVE_SOFT_DELETE_FILTER_REQUIRED = new Set([
  "$changeStream",
  "$collStats",
  "$currentOp",
  "$geoNear",
  "$indexStats",
  "$listLocalSessions",
  "$listSampledQueries",
  "$planCacheStats",
  "$querySettings",
  "$search",
  "$searchMeta",
  "$shardedDataDistribution",
  "$vectorSearch",
]);

export const getSoftDeleteFilter = (
  scope: SoftDeleteScope,
  options: { exact_active?: boolean } = {}
): Record<string, unknown> => {
  if (scope === "with_deleted") return {};
  return {
    is_deleted:
      scope === "only_deleted"
        ? true
        : options.exact_active
          ? false
          : { $ne: true },
  };
};

export const getSoftDeleteAggregateInsertionIndex = (
  pipeline: PipelineStage[]
): number => {
  const firstStage = pipeline[0];
  if (!firstStage) return 0;

  const firstOperator = Object.keys(firstStage)[0];
  return firstOperator && REQUIRED_FIRST_AGGREGATE_STAGES.has(firstOperator)
    ? 1
    : 0;
};

const applyQueryScope = function (this: SoftDeleteQuery): void {
  const scope = parseSoftDeleteScope(this.options.softDeleteScope);
  const exactActive = this.options.softDeleteExactActive === true;
  delete this.options.softDeleteScope;
  delete this.options.softDeleteExactActive;

  const currentFilter = { ...this.getFilter() } as Record<string, unknown>;
  delete currentFilter.is_deleted;
  this.setQuery({
    ...currentFilter,
    ...getSoftDeleteFilter(scope, { exact_active: exactActive }),
  });
};

const applyAggregateScope = function (this: SoftDeleteAggregate): void {
  const scope = parseSoftDeleteScope(this.options.softDeleteScope);
  delete this.options.softDeleteScope;

  const scopeFilter = getSoftDeleteFilter(scope);
  if (Object.keys(scopeFilter).length === 0) return;

  const pipeline = this.pipeline() as PipelineStage[];
  const firstOperator = pipeline[0] ? Object.keys(pipeline[0])[0] : undefined;
  if (
    firstOperator &&
    STAGE_NATIVE_SOFT_DELETE_FILTER_REQUIRED.has(firstOperator)
  ) {
    throw new Error(
      `${firstOperator} requires a stage-native soft-delete filter; use with_deleted or a dedicated repository query`
    );
  }
  pipeline.splice(getSoftDeleteAggregateInsertionIndex(pipeline), 0, {
    $match: scopeFilter,
  });
};

export const applySoftDeletePlugin = (schema: Schema): void => {
  schema.pre(/^(?:count|delete|distinct|find|replace|update)/, applyQueryScope);
  schema.pre("aggregate", applyAggregateScope);
};

export const setSoftDeleteScope = <T extends SoftDeleteScopeQuery>(
  query: T,
  scope: SoftDeleteScope,
  options: { exact_active?: boolean } = {}
): T => {
  query.setOptions({
    softDeleteScope: scope,
    ...(options.exact_active ? { softDeleteExactActive: true } : {}),
  });
  return query;
};

export const setAggregateSoftDeleteScope = <T extends SoftDeleteScopeAggregate>(
  aggregate: T,
  scope: SoftDeleteScope
): T => {
  aggregate.option({ softDeleteScope: scope });
  return aggregate;
};
