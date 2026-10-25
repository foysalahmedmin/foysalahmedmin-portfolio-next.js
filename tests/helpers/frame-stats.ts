/**
 * Smoothness maths for the harness (docs plan 3.7.1). Pure, so the budgets can be unit-tested and the
 * browser-side sampler only has to collect raw numbers.
 */
export type HarnessSamples = {
  /** requestAnimationFrame intervals, ms. */
  intervals: number[];
  /** Long animation frames (over 50 ms) after sampling started. */
  longFrames: Array<{ start: number; duration: number }>;
  /** Cumulative layout shift, excluding shifts right after input. */
  layoutShift: number;
  /** Duration of each interaction (Event Timing), ms. */
  interactions: number[];
};

export type FrameSummary = {
  frames: number;
  p50: number;
  p95: number;
  p99: number;
  max: number;
  /** Percent of frames that took more than one and a half refresh intervals. */
  droppedPercent: number;
  longFrames: number;
  cls: number;
  /** 75th percentile of interaction durations; null when nothing was interacted with. */
  interactionP75: number | null;
};

export type Profile = "desktop" | "constrained";

/** Budgets from docs plan 3.7.1 and 6.2. The constrained profile (4x CPU, tier T2) has no long-frame budget. */
export const BUDGETS = {
  desktop: { p95: 18, droppedPercent: 2, longFrames: 2 },
  constrained: { p95: 33, droppedPercent: 8, longFrames: Infinity },
} as const satisfies Record<
  Profile,
  { p95: number; droppedPercent: number; longFrames: number }
>;

export const CLS_BUDGET = 0.05;
export const INTERACTION_P75_BUDGET = 100;

export function percentile(
  values: readonly number[],
  fraction: number
): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * fraction) - 1)
  );
  return sorted[index]!;
}

export function summarise(samples: HarnessSamples): FrameSummary {
  const { intervals } = samples;
  const median = percentile(intervals, 0.5);
  // One and a half refresh intervals, with a floor so a 120 Hz display is not over-strict
  const threshold = Math.max(25, 1.5 * median);
  const dropped = intervals.filter((value) => value > threshold).length;

  return {
    frames: intervals.length,
    p50: median,
    p95: percentile(intervals, 0.95),
    p99: percentile(intervals, 0.99),
    max: intervals.length ? Math.max(...intervals) : 0,
    droppedPercent: intervals.length ? (dropped / intervals.length) * 100 : 0,
    longFrames: samples.longFrames.length,
    cls: samples.layoutShift,
    interactionP75: samples.interactions.length
      ? percentile(samples.interactions, 0.75)
      : null,
  };
}

/** The median of each metric across several runs, so one noisy run cannot fail (or pass) the gate. */
export function medianSummary(runs: readonly FrameSummary[]): FrameSummary {
  const pick = (read: (run: FrameSummary) => number) =>
    percentile(runs.map(read), 0.5);
  const interactions = runs
    .map((run) => run.interactionP75)
    .filter((value): value is number => value !== null);
  return {
    frames: pick((run) => run.frames),
    p50: pick((run) => run.p50),
    p95: pick((run) => run.p95),
    p99: pick((run) => run.p99),
    max: pick((run) => run.max),
    droppedPercent: pick((run) => run.droppedPercent),
    longFrames: pick((run) => run.longFrames),
    cls: pick((run) => run.cls),
    interactionP75: interactions.length ? percentile(interactions, 0.5) : null,
  };
}

/** Human-readable budget violations; an empty list means the run passes. */
export function checkBudget(profile: Profile, summary: FrameSummary): string[] {
  const budget = BUDGETS[profile];
  const violations: string[] = [];
  if (summary.frames < 30) {
    violations.push(
      `only ${summary.frames} frames were sampled; the page may not have rendered`
    );
  }
  if (summary.p95 > budget.p95) {
    violations.push(
      `p95 frame interval ${summary.p95.toFixed(1)} ms is over ${budget.p95} ms`
    );
  }
  if (summary.droppedPercent > budget.droppedPercent) {
    violations.push(
      `${summary.droppedPercent.toFixed(1)}% dropped frames is over ${budget.droppedPercent}%`
    );
  }
  if (summary.longFrames > budget.longFrames) {
    violations.push(
      `${summary.longFrames} long animation frames is over ${budget.longFrames}`
    );
  }
  if (summary.cls > CLS_BUDGET) {
    violations.push(
      `layout shift ${summary.cls.toFixed(3)} is over ${CLS_BUDGET}`
    );
  }
  if (
    summary.interactionP75 !== null &&
    summary.interactionP75 > INTERACTION_P75_BUDGET
  ) {
    violations.push(
      `interaction p75 ${summary.interactionP75.toFixed(0)} ms is over ${INTERACTION_P75_BUDGET} ms`
    );
  }
  return violations;
}
