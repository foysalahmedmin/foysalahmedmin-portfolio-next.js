import type { Browser, CDPSession, Page, TestInfo } from "@playwright/test";
import {
  checkBudget,
  medianSummary,
  summarise,
  type FrameSummary,
  type HarnessSamples,
  type Profile,
} from "../../helpers/frame-stats";

/**
 * The smoothness harness (docs plan 3.7.1, 6.6). A sampler runs inside the page and records
 * requestAnimationFrame intervals, long animation frames, layout shift and interaction latency; a
 * scripted run scrolls, hovers and clicks for about ten seconds; the maths and budgets live in
 * tests/helpers/frame-stats.ts so they are unit-tested without a browser.
 */
const SAMPLER_SOURCE = `
(() => {
  if (window.__harness) return;
  const state = { intervals: [], longFrames: [], layoutShift: 0, interactions: new Map(), running: false, last: 0, frame: 0 };
  const observe = (type, handle, extra) => {
    try {
      new PerformanceObserver((list) => list.getEntries().forEach(handle)).observe({ type, buffered: false, ...extra });
    } catch (error) { /* entry type not supported */ }
  };
  const tick = (time) => {
    if (!state.running) return;
    if (state.last) state.intervals.push(time - state.last);
    state.last = time;
    state.frame = requestAnimationFrame(tick);
  };
  observe('long-animation-frame', (entry) => {
    if (state.running) state.longFrames.push({ start: entry.startTime, duration: entry.duration });
  });
  observe('layout-shift', (entry) => {
    if (state.running && !entry.hadRecentInput) state.layoutShift += entry.value;
  });
  observe('event', (entry) => {
    if (!state.running || !entry.interactionId) return;
    const known = state.interactions.get(entry.interactionId) || 0;
    state.interactions.set(entry.interactionId, Math.max(known, entry.duration));
  }, { durationThreshold: 16 });
  window.__harness = {
    start() {
      state.intervals = []; state.longFrames = []; state.layoutShift = 0; state.interactions = new Map();
      state.last = 0; state.running = true;
      state.frame = requestAnimationFrame(tick);
    },
    stop() {
      state.running = false;
      cancelAnimationFrame(state.frame);
      return {
        intervals: state.intervals,
        longFrames: state.longFrames,
        layoutShift: state.layoutShift,
        interactions: Array.from(state.interactions.values()),
      };
    },
  };
})();
`;

export async function installSampler(page: Page): Promise<void> {
  await page.addInitScript({ content: SAMPLER_SOURCE });
}

/** 4x CPU slowdown for the constrained mobile profile (ADR 0009). Chromium only. */
export async function throttleCpu(
  page: Page,
  rate: number
): Promise<CDPSession> {
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setCPUThrottlingRate", { rate });
  return session;
}

type RunOptions = {
  /** Total length of the scripted run, ms. */
  durationMs?: number;
  /** Use touch gestures for scrolling instead of the mouse wheel. */
  touch?: boolean;
};

const pause = (page: Page, ms: number) => page.waitForTimeout(ms);

async function wheelScroll(
  page: Page,
  direction: 1 | -1,
  ms: number,
  speed: number
) {
  const started = Date.now();
  let last = started;
  while (Date.now() - started < ms) {
    const now = Date.now();
    const delta = Math.round(((now - last) / 1000) * speed) * direction;
    last = now;
    if (delta !== 0) await page.mouse.wheel(0, delta);
    await pause(page, 8);
  }
}

async function touchScroll(
  page: Page,
  session: CDPSession,
  direction: 1 | -1,
  ms: number
) {
  const viewport = page.viewportSize() ?? { width: 393, height: 851 };
  const started = Date.now();
  while (Date.now() - started < ms) {
    await session.send("Input.synthesizeScrollGesture", {
      x: Math.round(viewport.width / 2),
      y: Math.round(viewport.height * (direction === 1 ? 0.75 : 0.25)),
      yDistance:
        direction === 1
          ? -Math.round(viewport.height * 0.5)
          : Math.round(viewport.height * 0.5),
      speed: 1_800,
      gestureSourceType: "touch",
    });
  }
}

/**
 * Scroll down, hover a few controls, click the theme toggle, scroll back up. Returns the raw samples.
 * The page must already be loaded and settled (the caller waits for the engine).
 */
export async function scriptedRun(
  page: Page,
  { durationMs = 10_000, touch = false }: RunOptions = {}
): Promise<HarnessSamples> {
  const session = touch ? await page.context().newCDPSession(page) : null;
  const viewport = page.viewportSize() ?? { width: 1280, height: 800 };
  await page.mouse.move(viewport.width / 2, viewport.height / 2);
  await page.evaluate(() =>
    (window as unknown as { __harness: { start(): void } }).__harness.start()
  );

  const down = Math.round(durationMs * 0.5);
  const up = Math.round(durationMs * 0.25);
  if (touch && session) await touchScroll(page, session, 1, down);
  else await wheelScroll(page, 1, down, 1_600);

  // Hover sweep over whatever is interactive on screen
  const targets = await page
    .locator("a[href]:visible, button:visible")
    .evaluateAll((elements) =>
      elements.slice(0, 6).map((element) => {
        const rect = element.getBoundingClientRect();
        return { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
      })
    );
  for (const target of targets) {
    await page.mouse.move(target.x, target.y, { steps: 6 });
    await pause(page, 40);
  }

  // A click that does real work (theme change repaints the page); skipped when the page has none
  const toggle = page
    .getByRole("button", { name: "Change color theme" })
    .first();
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
    await pause(page, 200);
    await toggle.click();
    await pause(page, 200);
  }

  if (touch && session) await touchScroll(page, session, -1, up);
  else await wheelScroll(page, -1, up, 1_600);

  return page.evaluate(() =>
    (
      window as unknown as { __harness: { stop(): HarnessSamples } }
    ).__harness.stop()
  );
}

export type MeasureResult = {
  runs: FrameSummary[];
  median: FrameSummary;
  violations: string[];
};

/**
 * Measure `runs` scripted runs (reloading each time) and judge the median. Three runs by default: one
 * noisy run on a shared CI machine can neither fail nor rescue the gate.
 */
export async function measureRoute(
  page: Page,
  route: string,
  profile: Profile,
  {
    runs = 3,
    durationMs = 10_000,
    ready,
  }: {
    runs?: number;
    durationMs?: number;
    ready?: (page: Page) => Promise<void>;
  } = {}
): Promise<MeasureResult> {
  const summaries: FrameSummary[] = [];
  for (let run = 0; run < runs; run += 1) {
    await page.goto(route, { waitUntil: "load" });
    await ready?.(page);
    await pause(page, 500);
    const samples = await scriptedRun(page, {
      durationMs,
      touch: profile === "constrained",
    });
    summaries.push(summarise(samples));
  }
  const median = medianSummary(summaries);
  return { runs: summaries, median, violations: checkBudget(profile, median) };
}

/** Re-run once under Chromium tracing and attach the trace, so a failure comes with evidence. */
export async function attachTraceOnFailure(
  browser: Browser,
  page: Page,
  testInfo: TestInfo,
  route: string,
  profile: Profile
): Promise<void> {
  const path = testInfo.outputPath(`smoothness-trace-${profile}.json`);
  await browser.startTracing(page, {
    path,
    categories: [
      "devtools.timeline",
      "disabled-by-default-devtools.timeline",
      "blink.user_timing",
      "loading",
    ],
  });
  try {
    await page.goto(route, { waitUntil: "load" });
    await pause(page, 500);
    await scriptedRun(page, {
      durationMs: 6_000,
      touch: profile === "constrained",
    });
  } finally {
    await browser.stopTracing();
  }
  await testInfo.attach(`trace-${profile}`, {
    path,
    contentType: "application/json",
  });
}
