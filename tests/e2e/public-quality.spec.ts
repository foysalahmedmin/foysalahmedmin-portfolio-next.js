import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

test.describe.configure({ mode: "serial" });

const assertNoHorizontalOverflow = async (page: Page) => {
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
};

const PUBLIC_ROUTES = [
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
  for (const route of PUBLIC_ROUTES) {
    test(`${route} (${theme}) has landmarks, no serious axe findings, and no overflow`, async ({
      page,
    }) => {
      await page.addInitScript((value) => {
        localStorage.setItem(
          "setting",
          JSON.stringify({ theme: value, direction: "ltr", language: "en" })
        );
      }, theme);
      await page.goto(route);
      // Dynamic routes stream behind a skeleton; wait for the single, settled main
      await expect(page.locator("main")).toHaveCount(1);
      await expect(page.locator("main")).not.toHaveAttribute(
        "aria-busy",
        "true"
      );
      await expect(page.locator("main")).toBeVisible();
      await expect(page.locator("header[data-chrome]")).toBeVisible();
      await expect(page.locator("footer")).toBeVisible();
      await assertNoHorizontalOverflow(page);

      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const releaseBlocking = result.violations.filter(
        ({ impact }) => impact === "critical" || impact === "serious"
      );
      expect(releaseBlocking).toEqual([]);
    });
  }
}

for (const route of ["/about", "/contact"] as const) {
  test(`${route} has landmarks, no serious axe findings, and no overflow`, async ({
    page,
  }) => {
    await page.goto(route);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.locator("header[data-chrome]")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();
    await assertNoHorizontalOverflow(page);

    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const releaseBlocking = result.violations.filter(
      ({ impact }) => impact === "critical" || impact === "serious"
    );
    expect(releaseBlocking).toEqual([]);
  });
}

test("mobile navigation is labelled, keyboard operable, and closes with Escape", async ({
  page,
}, testInfo) => {
  test.skip(!testInfo.project.name.includes("mobile"), "mobile viewport only");
  await page.goto("/about");
  const trigger = page.getByRole("button", { name: "Open navigation" });
  await trigger.focus();
  await page.keyboard.press("Enter");
  await expect(
    page.getByRole("button", { name: "Close navigation" })
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Open navigation" })
  ).toBeFocused();
});

test("explicit motion preference persists and becomes effective", async ({
  page,
}) => {
  await page.goto("/contact");
  const control = page.getByLabel("Motion preference");
  await control.selectOption("off");
  await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
  await page.reload();
  await expect(control).toHaveValue("off");
});
