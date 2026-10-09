import { expect, test } from "@playwright/test";

/**
 * Visual contract for every public route in both themes at reduced motion. Baselines are generated per
 * platform (`pnpm test:visual:update`) and are not committed; the System lab page is the faster
 * consistency regression target (docs plan 3.15).
 */
const routes = [
  "/",
  "/about",
  "/contact",
  "/projects",
  "/case-studies",
  "/articles",
  "/videos",
  "/privacy",
  "/terms",
] as const;

for (const theme of ["dark", "light"] as const) {
  for (const route of routes) {
    test(`${route} (${theme}) public shell visual contract`, async ({
      page,
    }) => {
      await page.addInitScript((value) => {
        localStorage.setItem(
          "setting",
          JSON.stringify({ theme: value, direction: "ltr", language: "en" })
        );
      }, theme);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.goto(route);
      await expect(page.locator("main:not([aria-busy])")).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page).toHaveScreenshot(
        `${route === "/" ? "home" : route.slice(1)}-${theme}-reduced-1280.png`,
        {
          animations: "disabled",
          caret: "hide",
          fullPage: true,
          maxDiffPixelRatio: 0.01,
        }
      );
    });
  }
}
