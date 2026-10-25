import {
  BUDGETS,
  checkBudget,
  medianSummary,
  percentile,
  summarise,
  type HarnessSamples,
} from "../helpers/frame-stats";
import { describe, expect, it } from "vitest";

const samples = (overrides: Partial<HarnessSamples> = {}): HarnessSamples => ({
  intervals: Array.from({ length: 600 }, () => 16.7),
  longFrames: [],
  layoutShift: 0,
  interactions: [],
  ...overrides,
});

describe("percentile", () => {
  it("is the nearest-rank value and tolerates empty input", () => {
    expect(percentile([], 0.95)).toBe(0);
    expect(percentile([5], 0.95)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5, 6, 7, 8, 9, 10], 0.5)).toBe(5);
    expect(percentile([10, 1, 9, 2, 8, 3, 7, 4, 6, 5], 0.9)).toBe(9);
  });
});

describe("summarise", () => {
  it("reports a clean 60 Hz run", () => {
    const summary = summarise(samples());
    expect(summary.p95).toBeCloseTo(16.7, 1);
    expect(summary.droppedPercent).toBe(0);
    expect(summary.interactionP75).toBeNull();
    expect(checkBudget("desktop", summary)).toEqual([]);
    expect(checkBudget("constrained", summary)).toEqual([]);
  });

  it("counts frames over one and a half intervals as dropped", () => {
    const intervals = Array.from({ length: 100 }, (_, index) =>
      index < 5 ? 50 : 16.7
    );
    const summary = summarise(samples({ intervals }));
    expect(summary.droppedPercent).toBeCloseTo(5, 5);
    expect(summary.max).toBe(50);
  });

  it("does not call a 120 Hz run janky or a 30 Hz run clean", () => {
    expect(
      summarise(samples({ intervals: Array.from({ length: 300 }, () => 8.3) }))
        .droppedPercent
    ).toBe(0);
    // Steady 30 fps: every interval is the median, so none is "dropped", but p95 breaks the budget
    const slow = summarise(
      samples({ intervals: Array.from({ length: 300 }, () => 33.3) })
    );
    expect(slow.droppedPercent).toBe(0);
    expect(checkBudget("desktop", slow).join()).toMatch(/p95/);
  });

  it("takes the 75th percentile of interactions", () => {
    const summary = summarise(samples({ interactions: [20, 30, 40, 200] }));
    expect(summary.interactionP75).toBe(40);
  });
});

describe("checkBudget", () => {
  it("applies the desktop and constrained budgets from the plan", () => {
    expect(BUDGETS.desktop).toEqual({
      p95: 18,
      droppedPercent: 2,
      longFrames: 2,
    });
    expect(BUDGETS.constrained.p95).toBe(33);
    expect(BUDGETS.constrained.droppedPercent).toBe(8);

    const borderline = summarise(
      samples({
        intervals: Array.from({ length: 100 }, (_, i) => (i < 93 ? 16.7 : 30)),
      })
    );
    expect(checkBudget("desktop", borderline).join()).toMatch(/p95/);
    expect(checkBudget("constrained", borderline)).toEqual([]);
  });

  it("fails on long frames, layout shift and slow interactions", () => {
    const summary = summarise(
      samples({
        longFrames: [
          { start: 1, duration: 60 },
          { start: 2, duration: 70 },
          { start: 3, duration: 80 },
        ],
        layoutShift: 0.09,
        interactions: [250],
      })
    );
    const violations = checkBudget("desktop", summary).join(" | ");
    expect(violations).toMatch(/3 long animation frames/);
    expect(violations).toMatch(/layout shift/);
    expect(violations).toMatch(/interaction p75/);
  });

  it("refuses a run that sampled almost nothing", () => {
    expect(
      checkBudget("desktop", summarise(samples({ intervals: [16, 16] }))).join()
    ).toMatch(/only 2 frames/);
  });
});

describe("medianSummary", () => {
  it("lets one noisy run neither fail nor rescue the gate", () => {
    const good = summarise(samples());
    const bad = summarise(
      samples({ intervals: Array.from({ length: 600 }, () => 60) })
    );
    expect(checkBudget("desktop", medianSummary([good, bad, good]))).toEqual(
      []
    );
    expect(
      checkBudget("desktop", medianSummary([bad, good, bad])).join()
    ).toMatch(/p95/);
  });
});
