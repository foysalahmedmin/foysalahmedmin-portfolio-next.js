import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { settle } from "./support/settle";

/**
 * The home sections on the sections lab (`/lab/sections`, served in development and with MOTION_LAB=1):
 * stacked role panels, the process rail with its arrows, and the FAQ accordion. Checks structure and
 * behaviour a screenshot would not: panels really stack, the arrows really scroll and stop at the ends,
 * there are no numbers in cards, and there is no overflow or serious axe finding in either theme.
 */
const LAB = "/lab/sections";

test.beforeEach(async ({ request }) => {
  const probe = await request.get(LAB);
  test.skip(
    probe.status() === 404,
    "the lab is off in this build (MOTION_LAB=1)"
  );
});

const open = async (page: Page, theme: "dark" | "light" = "dark") => {
  await page.addInitScript((value) => {
    localStorage.setItem(
      "setting",
      JSON.stringify({ theme: value, direction: "ltr", language: "en" })
    );
  }, theme);
  await page.goto(LAB);
  await expect(page.locator("#pillar-showcase")).toBeVisible();
};

test("the role panels slide over each other", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name === "chromium-mobile", "desktop layout");
  await open(page);
  const panels = page.locator(".stack-panel");
  await expect(panels).toHaveCount(3);
  for (let index = 0; index < 3; index += 1) {
    await expect(panels.nth(index)).toHaveCSS("position", "sticky");
  }
  const top = await page
    .locator("#pillar-showcase")
    .evaluate(
      (element) => element.getBoundingClientRect().top + window.scrollY
    );
  // Scrolled well into the section, the first panel is held at the top while the third arrives
  await page.evaluate((y) => window.scrollTo(0, y + 1400), top);
  const held = await panels
    .nth(0)
    .evaluate((element) => element.getBoundingClientRect().top);
  expect(held).toBeGreaterThan(60);
  expect(held).toBeLessThan(160);
});

test("the process row moves with the arrows and stops at its ends", async ({
  page,
}) => {
  await open(page);
  const track = page.getByRole("list", { name: "Working process steps" });
  await track.scrollIntoViewIfNeeded();
  const previous = page.getByRole("button", { name: "Previous" });
  const next = page.getByRole("button", { name: "Next" });
  await expect(previous).toBeDisabled();
  await expect(next).toBeEnabled();

  const before = await track.evaluate((element) => element.scrollLeft);
  await next.click();
  await expect
    .poll(() => track.evaluate((element) => element.scrollLeft))
    .toBeGreaterThan(before + 100);
  await expect(previous).toBeEnabled();

  for (let guard = 0; guard < 8 && (await next.isEnabled()); guard += 1) {
    await next.click();
    await page.waitForTimeout(450);
  }
  await expect(next).toBeDisabled();
});

test("cards carry no numbers and the FAQ opens one answer at a time", async ({
  page,
}) => {
  await open(page);
  const text = (await page.locator("main").innerText()).replace(/\s+/g, " ");
  expect(text).not.toMatch(/\b0[1-9]\b/);
  expect(text).not.toMatch(/\bAnswer \d/i);
  expect(text).not.toMatch(/(^|\s)\d\.\s+[A-Z]/);

  const items = page.locator("details[name='faq']");
  await expect(items.nth(0)).toHaveAttribute("open", "");
  await items.nth(1).locator("summary").click();
  await expect(items.nth(1)).toHaveAttribute("open", "");
  await expect(items.nth(0)).not.toHaveAttribute("open", "");
});

for (const theme of ["dark", "light"] as const) {
  test(`no overflow and no serious axe findings (${theme})`, async ({
    page,
  }) => {
    await open(page, theme);
    await settle(page);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
      .analyze();
    expect(
      results.violations
        .filter(({ impact }) => impact === "critical" || impact === "serious")
        .map(
          (violation) =>
            `${violation.id} -> ${violation.nodes.map((node) => node.target.join(" ")).join(", ")}`
        )
    ).toEqual([]);
  });
}
