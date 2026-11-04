import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Profile } from "../helpers/frame-stats";
import {
  installSampler,
  measureRoute,
  throttleCpu,
} from "./support/frame-sampler";

/**
 * The hero's frame budget with the live canvas on a real GPU (docs plan 3.7.1, 6.2).
 *
 * CI has no GPU: headless Chromium there renders WebGL in software, the GPU probe sends the hero to the
 * poster, and `smoothness.spec.ts` measures that. This spec runs the canvas for real, so it is opt in:
 *
 *   PLAYWRIGHT_GPU=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:3107 \
 *     pnpm exec playwright test tests/e2e/hero-gpu.spec.ts --project=chromium-desktop --project=chromium-mobile
 *
 * Desktop is the full scene (T3) unthrottled; the phone profile is the simplified scene (T2) at 4x CPU
 * slowdown with touch, where the engine is intentionally absent. Each is the median of three
 * ten-second scripted runs, against the same budgets as the other routes.
 */
test.skip(
  !process.env.PLAYWRIGHT_GPU,
  "needs a machine with a GPU; set PLAYWRIGHT_GPU=1"
);
test.use({
  launchOptions: {
    args: ["--use-angle=metal", "--ignore-gpu-blocklist", "--enable-gpu"],
  },
});

test("the live hero stays within the frame budget on a GPU", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name === "firefox-desktop", "Chromium only");
  test.setTimeout(240_000);
  const constrained = testInfo.project.name === "chromium-mobile";
  const profile: Profile = constrained ? "constrained" : "desktop";

  await installSampler(page);
  if (constrained) await throttleCpu(page, 4);

  const result = await measureRoute(page, "/", profile, {
    ready: async (target) => {
      const host = target.locator("[data-hero-canvas]");
      await expect(host).toHaveAttribute("data-scene-gpu", "gpu", {
        timeout: 30_000,
      });
      await expect(host).toHaveAttribute("data-scene-state", "live", {
        timeout: 60_000,
      });
    },
  });

  const directory = join(process.cwd(), "test-results", "smoothness");
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, `gpu-${profile}-home.json`),
    JSON.stringify(
      { profile, median: result.median, runs: result.runs },
      null,
      2
    )
  );
  expect(result.violations, `/ with the live canvas (${profile})`).toEqual([]);
});
