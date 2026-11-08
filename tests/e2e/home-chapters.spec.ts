import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { settle } from "./support/settle";

/**
 * Phase 5 acceptance in a real browser: the home chapters on the chapters lab (`/lab/chapters`, served in
 * development and with MOTION_LAB=1, every chapter on including the tier-2 ones, no database needed).
 * Checks what a screenshot cannot: every chapter is there, at most three pinned scenes and each can be
 * skipped, the scroll-linked triage follows the page and the keyboard, reduced motion shows everything,
 * the deliverables viewer and the finder work from the keyboard (the finder with the network off),
 * the journeys end on the contact page with the topic, the page stays within its length budget, and
 * there is no overflow or serious axe finding in either theme.
 */
const LAB = "/lab/chapters";

const CHAPTERS = [
  "ingress",
  "proof-metrics",
  "triage",
  "services",
  "architecture-workflow",
  "case-studies",
  "deliverables",
  "working-process",
  "engagement",
  "fit",
  "finder",
  "skills",
  "commitments",
  "principles",
  "articles",
  "faq",
] as const;

const isMobile = (name: string) => name === "chromium-mobile";

test.beforeEach(async ({ request }) => {
  const probe = await request.get(LAB);
  test.skip(
    probe.status() === 404,
    "the lab is off in this build (MOTION_LAB=1)"
  );
});

/** `?tier=2` is the QA override that loads the motion engine; the lab itself is served without it otherwise. */
const open = async (
  page: Page,
  {
    theme = "dark",
    engine = true,
  }: { theme?: "dark" | "light"; engine?: boolean } = {}
) => {
  await page.addInitScript((value) => {
    localStorage.setItem(
      "setting",
      JSON.stringify({ theme: value, direction: "ltr", language: "en" })
    );
    // The still poster keeps a software renderer from slowing every frame; the chapters do not use the canvas
    localStorage.setItem("portfolio:scene-preference", "still");
  }, theme);
  await page.goto(engine ? `${LAB}?tier=2` : LAB);
  await expect(page.locator("#triage")).toBeAttached();
  if (engine) {
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion-engine",
      "ready",
      { timeout: 30_000 }
    );
    // The pins lengthen the page when they bind; positions measured before that are wrong
    await expect(
      page.locator('[data-pin-scene][data-pinned="true"]')
    ).toHaveCount(3, { timeout: 30_000 });
    // The engine refreshes its scroll triggers a moment after they bind (debounced); a scroll that lands
    // inside that refresh can end in the wrong place, so wait until the page height holds still
    let steady = 0;
    let previous = -1;
    for (let attempt = 0; attempt < 40 && steady < 4; attempt += 1) {
      const height = await page.evaluate(
        () => document.documentElement.scrollHeight
      );
      steady = height === previous ? steady + 1 : 0;
      previous = height;
      await page.waitForTimeout(150);
    }
    await page.waitForTimeout(400);
  }
};

const scrollToCentre = (page: Page, selector: string) =>
  page.evaluate((target) => {
    const element = document.querySelector(target);
    if (!element) throw new Error(`${target} not found`);
    const rect = element.getBoundingClientRect();
    window.scrollTo(
      0,
      window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2
    );
  }, selector);

test("every chapter of the home is on the page, in the plan's order", async ({
  page,
}) => {
  await open(page, { engine: false });
  const order = await page.evaluate((ids) => {
    const position = (id: string) => {
      const element = document.getElementById(id);
      return element
        ? element.getBoundingClientRect().top + window.scrollY
        : -1;
    };
    return ids.map((id) => [id, position(id)] as const);
  }, CHAPTERS);

  for (const [id, top] of order)
    expect(top, `#${id} is rendered`).toBeGreaterThan(-1);
  const tops = order.map(([, top]) => top);
  expect(tops).toEqual([...tops].sort((a, b) => a - b));
  // One h1 (the hero kicker); chapter titles are h2
  await expect(page.locator("h1")).toHaveCount(1);
});

test("the first role is complete at the top of the page, before any scroll", async ({
  page,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), "the pinned story is desktop");
  await open(page);
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  const first = page.locator('[data-hero] [data-pin-beat="0"]');
  const lines = first.locator(".hero-lead, .hero-caps li");
  expect(await lines.count()).toBeGreaterThanOrEqual(4);
  const states = await lines.evaluateAll((elements) =>
    elements.map((element) => ({
      opacity: Number(getComputedStyle(element).opacity),
      top: element.getBoundingClientRect().top,
      bottom: element.getBoundingClientRect().bottom,
      height: window.innerHeight,
    }))
  );
  for (const state of states) {
    expect(state.opacity).toBe(1);
    // On the first screen, above the fold
    expect(state.top).toBeGreaterThan(0);
    expect(state.bottom).toBeLessThan(state.height);
  }
  // The other roles still arrive with the scroll
  const second = page.locator('[data-hero] [data-pin-beat="1"] .hero-caps li');
  for (const opacity of await second.evaluateAll((elements) =>
    elements.map((element) => Number(getComputedStyle(element).opacity))
  )) {
    expect(opacity).toBe(0);
  }
});

test("at most three scenes pin and each one can be skipped from the keyboard", async ({
  page,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), "pins are for desktop");
  await open(page);
  const pinned = page.locator('[data-pin-scene][data-pinned="true"]');
  await expect(pinned).toHaveCount(3);

  const skips = page.locator('a[href^="#after-"]');
  await expect(skips).toHaveCount(3);
  for (const key of ["hero", "services", "architecture-workflow"]) {
    const link = page.locator(`a[href="#after-${key}"]`);
    await link.focus();
    await expect(link).toBeVisible();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id ?? ""), {
        message: `focus lands after the ${key} scene`,
      })
      .toBe(`after-${key}`);
  }
});

test("the triage follows the page and the keyboard, and each pain links to the contact form with its topic", async ({
  page,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), "scroll-linked on desktop");
  await open(page);
  const list = page.locator("#triage [data-scroll-focus]");
  const rows = list.locator("[data-focus-row]");
  const count = await rows.count();
  expect(count).toBeGreaterThanOrEqual(3);

  await scrollToCentre(page, `#triage [data-focus-row]:nth-child(${count})`);
  await expect
    .poll(() => list.getAttribute("data-focus-index"), {
      message: "the last pain is in focus once it reaches the middle",
    })
    .toBe(String(count - 1));

  await scrollToCentre(page, "#triage [data-focus-row]:nth-child(2)");
  await expect.poll(() => list.getAttribute("data-focus-index")).toBe("1");

  // A pain's link is reachable by keyboard and carries the topic
  const link = rows
    .nth(0)
    .getByRole("link", { name: /describe this problem/i });
  await link.focus();
  await expect(link).toBeFocused();
  expect(await link.getAttribute("href")).toMatch(/^\/contact\?topic=[^&]+$/);
  await link.click();
  await expect(page).toHaveURL(/\/contact\?topic=/);
});

test("reduced motion shows every chapter in full: no pins, no dimming, finished wires", async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await open(page, { engine: false });
  await settle(page);

  await expect(
    page.locator('[data-pin-scene][data-pinned="true"]')
  ).toHaveCount(0);
  await expect(
    page.locator("[data-scroll-focus][data-focus-index]")
  ).toHaveCount(0);

  const dimmed = await page.evaluate(
    () =>
      Array.from(
        document.querySelectorAll<HTMLElement>("#triage [data-focus-row] *")
      ).filter((element) => Number(getComputedStyle(element).opacity) < 0.99)
        .length
  );
  expect(dimmed, "nothing in the triage is dimmed").toBe(0);

  const progress = await page.evaluate(() =>
    Array.from(
      document.querySelectorAll<HTMLElement>("[data-scroll-progress]")
    ).map((element) =>
      getComputedStyle(element).getPropertyValue("--progress").trim()
    )
  );
  expect(progress.length).toBeGreaterThan(0);
  expect(progress.every((value) => value === "1")).toBe(true);
});

test("the deliverables viewer switches sample from the keyboard", async ({
  page,
}) => {
  await open(page, { engine: false });
  const radios = page.locator(
    '#deliverables [role="radiogroup"] input[type="radio"]'
  );
  expect(await radios.count()).toBeGreaterThanOrEqual(3);
  await expect(radios.nth(0)).toBeChecked();
  await radios.nth(0).focus();
  await page.keyboard.press("ArrowDown");
  await expect(radios.nth(1)).toBeChecked();
  await expect(radios.nth(0)).not.toBeChecked();
});

test("the starting-point finder answers with the network off and links to the contact form", async ({
  page,
}) => {
  await open(page, { engine: false });
  const finder = page.locator("#finder");
  const groups = finder.locator("fieldset");
  await expect(groups.first()).toBeVisible({ timeout: 30_000 });

  await page.context().setOffline(true);
  const steps = await groups.count();
  expect(steps).toBeGreaterThanOrEqual(2);
  for (let index = 0; index < steps; index += 1) {
    // The label's own click (what a tap does): it needs no hit-testing, so a fixed bar over the bottom of a
    // phone screen, or the result card shifting the layout as answers arrive, cannot make it flaky
    await groups
      .nth(index)
      .locator("label")
      .first()
      .evaluate((element) => (element as HTMLElement).click());
  }
  const result = finder.locator('[aria-live="polite"]');
  const describe = result.getByRole("link", { name: /describe it/i });
  await expect(describe).toBeVisible();
  expect(await describe.getAttribute("href")).toMatch(/^\/contact\?/);
  await page.context().setOffline(false);
});

test("the home stays within its length budget", async ({ page }, testInfo) => {
  test.skip(
    isMobile(testInfo.project.name),
    "the budget is measured at 1440x900"
  );
  await page.setViewportSize({ width: 1440, height: 900 });
  await open(page);
  await settle(page);
  const screens = await page.evaluate(
    () => document.documentElement.scrollHeight / window.innerHeight
  );
  // Plan 4.1: 24 screens for tier 1, 27 with tier 2 (the lab shows both)
  expect(screens).toBeLessThanOrEqual(27);
});

test("no horizontal overflow on a phone", async ({ page }, testInfo) => {
  test.skip(!isMobile(testInfo.project.name), "phone only");
  await open(page, { engine: false });
  await settle(page);
  const overflow = await page.evaluate(
    () =>
      document.documentElement.scrollWidth -
      document.documentElement.clientWidth
  );
  expect(overflow).toBeLessThanOrEqual(1);
});

for (const theme of ["dark", "light"] as const) {
  test(`no serious axe finding in the ${theme} theme`, async ({ page }) => {
    await open(page, { theme, engine: false });
    await settle(page);
    const result = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    const blocking = result.violations.filter(
      ({ impact }) => impact === "critical" || impact === "serious"
    );
    expect(
      blocking.map(({ id, nodes }) => `${id}: ${nodes[0]?.target.join(" ")}`)
    ).toEqual([]);
  });
}
