import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./support/admin-session";

/**
 * The admin console in a real browser (docs plan 7, Phase 7), signed in as a throwaway admin
 * (`E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD`; the specs skip without them). Covers the shell, the dashboard,
 * one list (audit log) and one editor (new article): landmarks, the keyboard path, the command palette, the
 * dashboard deep links, axe in both themes, no `backdrop-filter` outside overlays, and no animation library.
 */
const isMobile = (name: string) => name === "chromium-mobile";

test("the shell has its landmarks, a skip link, the active page marked and a collapsible rail", async ({
  admin: page,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), "the rail is a sheet on phones");
  await expect(page.getByRole("banner")).toBeVisible();
  await expect(page.getByRole("main")).toHaveCount(1);
  await expect(page.locator("#main-content")).toBeVisible();
  await expect(
    page.getByRole("link", { name: /skip to admin content/i })
  ).toHaveCount(1);
  await expect(
    page.locator('nav a[aria-current="page"]').first()
  ).toContainText("Dashboard");

  const toggle = page.getByRole("button", { name: /collapse|expand/i }).first();
  const before = await toggle.getAttribute("aria-expanded");
  await toggle.click();
  await expect(toggle).not.toHaveAttribute("aria-expanded", before ?? "");
  await toggle.click();
  await expect(toggle).toHaveAttribute("aria-expanded", before ?? "");
});

test("Cmd/Ctrl+K opens the console palette and jumps to a workspace", async ({
  admin: page,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), "keyboard shortcut");
  await page.keyboard.press("Control+K");
  const palette = page.getByRole("dialog");
  await expect(palette).toBeVisible();
  await palette.locator("input").fill("audit");
  await page.keyboard.press("Enter");
  await expect(page).toHaveURL(/\/admin\/audit/);
});

test("the dashboard leads with what needs attention and every deep link opens", async ({
  admin: page,
}) => {
  await expect(
    page.getByRole("heading", { level: 1, name: "Dashboard" })
  ).toBeVisible();
  const region = page.getByRole("region", { name: /needs attention/i });
  await expect(region).toBeVisible();
  const hrefs = await region
    .getByRole("link")
    .evaluateAll((links) =>
      links.map(
        (link) => (link as HTMLAnchorElement).getAttribute("href") ?? ""
      )
    );
  for (const href of hrefs.filter((value) => value.startsWith("/admin"))) {
    const response = await page.goto(href);
    expect(response?.status(), href).toBeLessThan(400);
    await expect(page.getByRole("main")).toBeVisible();
    await page.goBack();
  }
});

test("the inbox deep link opens the filtered inbox", async ({
  admin: page,
}) => {
  await page.goto("/admin/contacts?status=new");
  await expect(page.getByRole("main")).toBeVisible();
  await expect(page.locator('select[aria-label="Inbox status"]')).toHaveValue(
    "new"
  );
});

for (const scheme of ["dark", "light"] as const) {
  test(`no serious axe finding on the shell, dashboard, list and editor (${scheme})`, async ({
    admin: page,
  }) => {
    await page.emulateMedia({ colorScheme: scheme });
    for (const path of [
      "/admin",
      "/admin/audit",
      "/admin/articles/new",
      "/admin/site/review",
    ]) {
      await page.goto(path);
      await expect(page.getByRole("main")).toBeVisible();
      await page.waitForTimeout(600);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = result.violations.filter(
        ({ impact }) => impact === "critical" || impact === "serious"
      );
      expect(
        blocking.map(
          ({ id, nodes }) => `${path} ${id}: ${nodes[0]?.target.join(" ")}`
        )
      ).toEqual([]);
    }
  });
}

// Phase 8: every swept workspace opens, has one main landmark and a page title, and passes axe in both themes.
const SWEPT = [
  "/admin/projects",
  "/admin/projects/new",
  "/admin/case-studies/new",
  "/admin/videos/new",
  "/admin/site",
  "/admin/pages",
  "/admin/contacts",
  "/admin/reviews",
  "/admin/media",
  "/admin/users",
  "/admin/taxonomy",
  "/admin/settings",
  "/admin/project-resources",
];
for (const scheme of ["dark", "light"] as const) {
  test(`the swept workspaces have no serious axe finding (${scheme})`, async ({
    admin: page,
  }) => {
    test.setTimeout(120_000);
    await page.emulateMedia({ colorScheme: scheme });
    for (const path of SWEPT) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBeLessThan(400);
      await expect(page.getByRole("main")).toHaveCount(1);
      await expect(
        page.getByRole("heading", { level: 1 }).first()
      ).toBeVisible();
      await page.waitForTimeout(500);
      const result = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const blocking = result.violations.filter(
        ({ impact }) => impact === "critical" || impact === "serious"
      );
      expect(
        blocking.map(
          ({ id, nodes }) => `${path} ${id}: ${nodes[0]?.target.join(" ")}`
        )
      ).toEqual([]);
    }
  });
}

test("the content editors keep the sticky action bar and the back link has a real size", async ({
  admin: page,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), "desktop layout");
  for (const path of [
    "/admin/projects/new",
    "/admin/case-studies/new",
    "/admin/videos/new",
    "/admin/articles/new",
  ]) {
    await page.goto(path);
    await expect(page.getByText(/no unsaved changes/i)).toBeVisible();
    const back = page.getByRole("link", { name: /^back to/i }).first();
    const box = await back.boundingBox();
    expect(box?.width, path).toBeGreaterThanOrEqual(32);
    const iconWidth = await back
      .locator("svg")
      .evaluate((node) => node.getBoundingClientRect().width);
    expect(iconWidth, path).toBeGreaterThanOrEqual(14);
  }
});

test("no backdrop-filter outside overlays, and no animation library in the console", async ({
  admin: page,
}) => {
  const scripts: string[] = [];
  page.on("response", async (response) => {
    if (!/\/_next\/static\/.*\.js(\?|$)/.test(response.url())) return;
    try {
      scripts.push(await response.text());
    } catch {
      /* aborted */
    }
  });
  await page.goto("/admin");
  await expect(page.getByRole("main")).toBeVisible();
  await page.waitForTimeout(1500);

  const offenders = await page.evaluate(() =>
    Array.from(document.querySelectorAll<HTMLElement>("body *"))
      .filter((element) => {
        const filter = getComputedStyle(element).backdropFilter;
        if (!filter || filter === "none") return false;
        return !element.closest(
          '[role="dialog"], [data-slot="modal-content"], [data-slot="drawer-content"], [data-sonner-toast], [role="status"]'
        );
      })
      .map((element) => element.tagName.toLowerCase() + "." + element.className)
  );
  expect(offenders).toEqual([]);

  expect(
    await page.evaluate(
      () => document.documentElement.dataset.motionEngine ?? ""
    )
  ).not.toBe("ready");
  expect(
    scripts.some((source) => /ScrollTrigger|SplitText|new Lenis/.test(source))
  ).toBe(false);
});

test("the editor has a section index and a sticky action bar", async ({
  admin: page,
}, testInfo) => {
  test.skip(isMobile(testInfo.project.name), "desktop layout");
  await page.goto("/admin/articles/new");
  await expect(
    page.getByRole("heading", { level: 1, name: /new article/i })
  ).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Publishing" }).first()
  ).toBeVisible();
  await expect(page.getByText(/no unsaved changes/i)).toBeVisible();
  await page.getByLabel("Title").first().fill("A title");
  await expect(page.getByText(/1 unsaved change/i)).toBeVisible();
});
