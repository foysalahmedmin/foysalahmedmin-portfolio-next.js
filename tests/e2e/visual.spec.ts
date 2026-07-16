import { expect, test } from "@playwright/test";

const routes = ["/about", "/contact"] as const;

for (const route of routes) {
  test(`${route} public shell visual contract`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light", reducedMotion: "reduce" });
    await page.goto(route);
    await page.evaluate(() => document.fonts.ready);
    await expect(page).toHaveScreenshot(
      `${route.slice(1)}-light-reduced-1280.png`,
      {
        animations: "disabled",
        caret: "hide",
        fullPage: true,
        maxDiffPixelRatio: 0.01,
      }
    );
  });
}
