import { expect, test } from "@playwright/test";
import { checkBudget, summarise } from "../helpers/frame-stats";
import { installSampler, scriptedRun } from "./support/frame-sampler";

/**
 * Harness self-test: a gate that cannot fail proves nothing. A smooth page must pass the desktop
 * budget and a page that burns 80 ms every fourth frame must fail it, with the right reasons.
 */
const page_ = (script: string) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>harness fixture</title>
<style>body{margin:0}.row{height:64px;border-bottom:1px solid #888}</style></head>
<body>${Array.from({ length: 400 }, (_, i) => `<div class="row">row ${i}</div>`).join("")}
<script>${script}</script></body></html>`;

test.describe("smoothness harness self-test", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium only");
  test.setTimeout(60_000);

  test("passes a page that does no work per frame", async ({ page }) => {
    await page.route("**/__harness__/smooth", (route) =>
      route.fulfill({ contentType: "text/html", body: page_("") })
    );
    await installSampler(page);
    await page.goto("/__harness__/smooth");
    const summary = summarise(await scriptedRun(page, { durationMs: 4_000 }));

    expect(summary.frames).toBeGreaterThan(60);
    expect(checkBudget("desktop", summary)).toEqual([]);
  });

  test("fails a page that blocks the main thread on every fourth frame", async ({
    page,
  }) => {
    await page.route("**/__harness__/janky", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: page_(
          "var n=0;(function burn(){if(++n%4===0){var t=performance.now();while(performance.now()-t<80);}requestAnimationFrame(burn)})()"
        ),
      })
    );
    await installSampler(page);
    await page.goto("/__harness__/janky");
    const summary = summarise(await scriptedRun(page, { durationMs: 4_000 }));
    const violations = checkBudget("desktop", summary);

    expect(summary.p95).toBeGreaterThan(40);
    expect(violations.join(" | ")).toMatch(/p95 frame interval/);
    expect(violations.join(" | ")).toMatch(/dropped frames/);
    expect(violations.join(" | ")).toMatch(/long animation frames/);
  });
});
