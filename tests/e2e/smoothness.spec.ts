import { expect, test, type Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Profile } from "../helpers/frame-stats";
import {
  attachTraceOnFailure,
  installSampler,
  measureRoute,
  throttleCpu,
} from "./support/frame-sampler";

/**
 * The smoothness gate (docs plan 3.7.1, 6.6): a scripted ten-second scroll plus hover and click run on
 * the routes that carry the most motion, judged by the median of three runs against the frame budgets.
 * Desktop runs unthrottled with the engine on; the constrained profile runs a touch device at 4x CPU
 * slowdown (ADR 0009), where the engine is intentionally absent. A failing route re-runs once under
 * Chromium tracing and attaches the trace.
 *
 * Meant for a production build (`next start`); on the dev server the numbers describe the dev server.
 */
const ROUTES = ["/", "/about", "/projects"] as const;
// The sandbox exercises every built effect at once; it exists in dev and with MOTION_LAB=1
const LAB_ROUTE = "/lab/motion";

const waitForEngine = (expected: "ready" | "off") => async (page: Page) => {
  await expect(page.locator("html")).toHaveAttribute(
    "data-motion-engine",
    expected === "ready" ? "ready" : /off|failed/,
    { timeout: 20_000 }
  );
};

test.describe("smoothness", () => {
  test.skip(
    ({ browserName }) => browserName !== "chromium",
    "frame sampling and CPU throttling use Chromium DevTools"
  );
  // Ten seconds per run, three runs, plus load: well past the default test timeout
  test.setTimeout(180_000);

  for (const route of [...ROUTES, LAB_ROUTE]) {
    test(`${route} stays within the frame budget`, async ({
      page,
      browser,
    }, testInfo) => {
      const constrained = testInfo.project.name === "chromium-mobile";
      const profile: Profile = constrained ? "constrained" : "desktop";

      if (route === LAB_ROUTE) {
        const probe = await page.request.get(route);
        test.skip(
          probe.status() === 404,
          "the Motion lab is off in this build (MOTION_LAB=1)"
        );
      }

      await installSampler(page);
      if (constrained) await throttleCpu(page, 4);

      const result = await measureRoute(page, route, profile, {
        ready: waitForEngine(constrained ? "off" : "ready"),
      });

      // Also written to disk so CI uploads the numbers and the phase findings can quote them
      const directory = join(process.cwd(), "test-results", "smoothness");
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        join(
          directory,
          `${profile}-${route === "/" ? "home" : route.slice(1).replace(/\//g, "-")}.json`
        ),
        JSON.stringify(
          { route, profile, median: result.median, runs: result.runs },
          null,
          2
        )
      );

      await testInfo.attach("smoothness-summary", {
        body: JSON.stringify(
          { route, profile, median: result.median, runs: result.runs },
          null,
          2
        ),
        contentType: "application/json",
      });

      if (result.violations.length > 0) {
        await attachTraceOnFailure(browser, page, testInfo, route, profile);
      }
      expect(result.violations, `${route} (${profile})`).toEqual([]);
    });
  }
});
