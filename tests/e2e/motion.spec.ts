import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { settle } from "./support/settle";

/**
 * Phase 2 acceptance in a real browser (docs plan Phase 2): the engine is present only for full motion
 * with a fine pointer, absent for reduced, off and touch; failure leaves the page intact; reduced and
 * off render the end frame; smooth scroll keeps anchors, focus and history honest; the route shutter and
 * the command palette work from the keyboard and for assistive technology.
 */
const LAB = "/lab/motion";

const isMobile = (name: string) => name === "chromium-mobile";

const describeViolations = (
  violations: Awaited<ReturnType<AxeBuilder["analyze"]>>["violations"]
) =>
  violations.map(
    (violation) =>
      `${violation.id}: ${violation.help} -> ${violation.nodes
        .map((node) => node.target.join(" "))
        .join(", ")}`
  );

const waitForEngine = (page: Page, state: string | RegExp = "ready") =>
  expect(page.locator("html")).toHaveAttribute("data-motion-engine", state, {
    timeout: 20_000,
  });

/** Records every script that contains the animation libraries, whichever chunk it lands in. */
function trackMotionChunks(page: Page) {
  const loaded: string[] = [];
  page.on("response", async (response) => {
    const url = response.url();
    if (!/\/_next\/static\/.*\.js(\?|$)/.test(url)) return;
    try {
      const body = await response.text();
      if (/ScrollTrigger|lenis-smooth/.test(body)) loaded.push(url);
    } catch {
      /* the response was aborted */
    }
  });
  return loaded;
}

test.beforeEach(async ({ page, request }) => {
  const probe = await request.get(LAB);
  test.skip(
    probe.status() === 404,
    "the Motion lab is off in this build (MOTION_LAB=1)"
  );
  // Fresh visitor: no saved preference, no tier override
  await page.addInitScript(() => {
    try {
      window.localStorage.removeItem("portfolio:motion-preference");
      window.sessionStorage.removeItem("portfolio:tier-override");
    } catch {
      /* storage blocked */
    }
  });
});

test.describe("engine policy", () => {
  test("loads for full motion with a fine pointer", async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    const chunks = trackMotionChunks(page);
    await page.goto("/");
    await waitForEngine(page);
    await expect(page.locator("html")).toHaveClass(/lenis/);
    // The hero's GPU probe may lower the tier once it asks for a context: a software renderer (headless
    // Chromium, CI) lands on 1, which the hero spec covers. Any resolved tier proves the engine ran.
    await expect(page.locator("html")).toHaveAttribute("data-tier", /^[123]$/);
    expect(chunks.length).toBeGreaterThan(0);
  });

  test("is absent when the OS asks for reduced motion", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const chunks = trackMotionChunks(page);
    await page.goto("/");
    await waitForEngine(page, "off");
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion",
      "reduced"
    );
    await page.waitForTimeout(2_500);
    expect(chunks).toEqual([]);
    await context.close();
  });

  test("is absent when the visitor turns motion off", async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    await page.addInitScript(() => {
      window.localStorage.setItem("portfolio:motion-preference", "off");
    });
    const chunks = trackMotionChunks(page);
    await page.goto("/");
    await waitForEngine(page, "off");
    await expect(page.locator("html")).toHaveAttribute("data-motion", "off");
    await page.waitForTimeout(2_500);
    expect(chunks).toEqual([]);
  });

  test("is absent on touch", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "touch project only");
    const chunks = trackMotionChunks(page);
    await page.goto("/");
    await waitForEngine(page, "off");
    await page.waitForTimeout(2_500);
    expect(chunks).toEqual([]);
    await expect(page.locator("html")).not.toHaveClass(/lenis/);
  });

  test("a failed load leaves the page whole and the session on the CSS tier", async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route(/\/_next\/static\/.*\.js(\?|$)/, async (route) => {
      const response = await route.fetch();
      const body = await response.text();
      if (/ScrollTrigger|lenis-smooth/.test(body)) await route.abort();
      else await route.fulfill({ response, body });
    });
    await page.goto(LAB);
    await waitForEngine(page, "failed");
    await expect(
      page.getByRole("heading", { level: 1, name: "Motion lab" })
    ).toBeVisible();
    await expect(page.locator("[data-lab-value='Engine']")).toHaveText(
      "failed"
    );
    // Still navigable and still running
    await page.getByRole("link", { name: "Second page" }).first().click();
    await expect(page).toHaveURL(/\/lab\/motion\/next$/);
    expect(errors).toEqual([]);
  });

  test("?tier forces a tier and survives navigation", async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    await page.goto(`${LAB}?tier=1`);
    await expect(page.locator("html")).toHaveAttribute("data-tier", "1");
    await waitForEngine(page, "off");
    await page.getByRole("link", { name: "Second page" }).first().click();
    await expect(page).toHaveURL(/\/lab\/motion\/next$/);
    await expect(page.locator("html")).toHaveAttribute("data-tier", "1");
    await page.goto(`${LAB}?tier=auto`);
    // The hero's GPU probe may lower the tier once it asks for a context: a software renderer (headless
    // Chromium, CI) lands on 1, which the hero spec covers. Any resolved tier proves the engine ran.
    await expect(page.locator("html")).toHaveAttribute("data-tier", /^[123]$/);
  });
});

test.describe("reduced and off render the end frame", () => {
  for (const mode of ["reduce", "off"] as const) {
    test(`${mode}: every effect shows its final state`, async ({ browser }) => {
      const context = await browser.newContext({
        reducedMotion: mode === "reduce" ? "reduce" : "no-preference",
      });
      const page = await context.newPage();
      if (mode === "off") {
        await page.addInitScript(() => {
          window.localStorage.setItem("portfolio:motion-preference", "off");
        });
      }
      await page.goto(LAB);
      await waitForEngine(page, "off");

      // Reveals are all shown and none holds a start pose
      const hidden = await page
        .locator("[data-reveal]:not([data-reveal-visible='true'])")
        .count();
      expect(hidden).toBe(0);
      // Headlines are whole text, not split lines
      await expect(page.locator("[data-text-reveal] .t-line")).toHaveCount(0);
      await expect(
        page.getByRole("heading", {
          level: 2,
          name: /Automation that you can switch off/,
        })
      ).toBeVisible();
      // Counters read their final numbers
      await expect(page.locator("[data-counter]").first()).toHaveText("3");
      await expect(page.locator("[data-counter]").nth(1)).toHaveText("1,280+");
      // The pin scene is a plain stacked list in reading order
      await expect(page.locator("[data-pin-scene]")).not.toHaveAttribute(
        "data-pinned",
        "true"
      );
      const tops = await page
        .locator("[data-pin-beat]")
        .evaluateAll((beats) =>
          beats.map((beat) => beat.getBoundingClientRect().top)
        );
      expect(tops).toHaveLength(3);
      expect(tops[0]!).toBeLessThan(tops[1]!);
      expect(tops[1]!).toBeLessThan(tops[2]!);
      // No smooth scroll, no cursor, no moving rail fill
      await expect(page.locator("html")).not.toHaveClass(/lenis/);
      await expect(page.locator("[data-cursor]")).toHaveCount(0);
      await context.close();
    });
  }
});

test.describe("full motion on desktop", () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
  });

  test("below-the-fold blocks wait for the view; the first screen is never hidden", async ({
    page,
  }) => {
    await page.goto(LAB);
    await waitForEngine(page);
    // The page heading and status are on the first screen: untouched
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
    // A reveal far below the fold is armed (ready) but not yet shown
    const wipe = page.locator("[data-reveal='wipe']");
    await expect(wipe).toHaveAttribute("data-reveal-ready", "true");
    await expect(wipe).not.toHaveAttribute("data-reveal-visible", "true");
    await wipe.scrollIntoViewIfNeeded();
    await expect(wipe).toHaveAttribute("data-reveal-visible", "true");
  });

  test("a headline splits into masked lines, settles, then returns to plain text", async ({
    page,
  }) => {
    await page.goto(LAB);
    await waitForEngine(page);
    const heading = page.getByRole("heading", {
      level: 2,
      name: /Automation that you can switch off/,
    });
    const text = (await heading.textContent())!;
    await heading.scrollIntoViewIfNeeded();
    // Lines exist while it plays...
    await expect
      .poll(() => heading.locator(".t-line").count(), { timeout: 5_000 })
      .toBeGreaterThan(0);
    // ...and the markup goes back to the server's once it has settled, so the end frame is the
    // reduced render and no line mask is left to clip a descender
    await expect
      .poll(() => heading.locator(".t-line").count(), { timeout: 5_000 })
      .toBe(0);
    await expect(heading).toHaveText(text);
    await expect(heading).toHaveAccessibleName(
      /Automation that you can switch off, with a human in the loop\./
    );
  });

  test("a count-up ends on the server-rendered number", async ({ page }) => {
    await page.goto(LAB);
    await waitForEngine(page);
    const counter = page.locator("[data-counter]").nth(1);
    await counter.scrollIntoViewIfNeeded();
    await expect(counter).toHaveText("1,280+", { timeout: 5_000 });
  });

  test("a pinned scene pins, advances its beats with scroll and unpins after", async ({
    page,
  }) => {
    await page.goto(LAB);
    await waitForEngine(page);
    const scene = page.locator("[data-pin-scene]");
    await expect(scene).toHaveAttribute("data-pinned", "true");
    await scene.scrollIntoViewIfNeeded();
    await page.evaluate(() => {
      const element = document.querySelector("[data-pin-scene]")!;
      window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY);
    });
    await expect(scene).toHaveAttribute("data-beat", "0");
    // Scroll through the pin: the beat index rises and the progress variable follows
    await page.mouse.move(640, 400);
    for (let step = 0; step < 14; step += 1) {
      await page.mouse.wheel(0, 120);
      await page.waitForTimeout(40);
    }
    await expect
      .poll(() => scene.getAttribute("data-beat"), { timeout: 5_000 })
      .not.toBe("0");
    const progress = await scene.evaluate((element) =>
      Number.parseFloat(
        getComputedStyle(element).getPropertyValue("--pin-progress")
      )
    );
    expect(progress).toBeGreaterThan(0);
    // Beats that are off stage take no focus
    const inert = await page.locator("[data-pin-beat][inert]").count();
    expect(inert).toBe(2);
  });

  test("anchors scroll under the header and move focus to the chapter", async ({
    page,
  }) => {
    await page.goto(LAB);
    await waitForEngine(page);
    const rail = page.getByRole("navigation", { name: "Chapters" });
    await rail.getByRole("link", { name: /Count-up/ }).click();

    await expect(page).toHaveURL(/#demo-M10$/);
    await expect
      .poll(async () => page.evaluate(() => document.activeElement?.id), {
        timeout: 5_000,
      })
      .toBe("demo-M10");
    // The target sits just under the sticky header, not behind it
    const gap = await page.evaluate(() => {
      const target = document.getElementById("demo-M10")!;
      const header = document.querySelector("header[data-chrome]")!;
      return (
        target.getBoundingClientRect().top -
        header.getBoundingClientRect().bottom
      );
    });
    expect(gap).toBeGreaterThanOrEqual(-4);
    expect(gap).toBeLessThan(160);
    // The rail marks it as the current chapter
    await expect(rail.getByRole("link", { name: /Count-up/ })).toHaveAttribute(
      "aria-current",
      "location"
    );
  });

  test("the skip link moves focus to the main content", async ({ page }) => {
    await page.goto("/about");
    await waitForEngine(page);
    await page.keyboard.press("Tab");
    await expect(
      page.getByRole("link", { name: "Skip to main content" })
    ).toBeFocused();
    await page.keyboard.press("Enter");
    await expect
      .poll(() => page.evaluate(() => document.activeElement?.id))
      .toBe("main-content");
  });

  test("back and forward restore the scroll position under smooth scroll", async ({
    page,
  }) => {
    await page.goto(LAB);
    await waitForEngine(page);
    await page.mouse.move(640, 400);
    for (let step = 0; step < 14; step += 1) {
      await page.mouse.wheel(0, 100);
      await page.waitForTimeout(30);
    }
    await page.waitForTimeout(800);
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(800);

    await page.getByRole("link", { name: "Second page" }).first().click();
    await expect(page).toHaveURL(/\/lab\/motion\/next$/);
    await expect(
      page.getByRole("heading", { level: 1, name: "Second page" })
    ).toBeVisible();
    await expect
      .poll(() => page.evaluate(() => window.scrollY))
      .toBeLessThan(10);

    await page.goBack();
    await expect(page).toHaveURL(/\/lab\/motion$/);
    await expect
      .poll(() => page.evaluate(() => window.scrollY), { timeout: 5_000 })
      .toBeGreaterThan(before - 40);
    const after = await page.evaluate(() => window.scrollY);
    expect(Math.abs(after - before)).toBeLessThan(40);
  });

  test("the route shutter runs, the header persists, and the new page is whole", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      (window as unknown as { __vtSeen: boolean }).__vtSeen = false;
      new MutationObserver(() => {
        if (document.documentElement.dataset.vt === "running") {
          (window as unknown as { __vtSeen: boolean }).__vtSeen = true;
        }
      }).observe(document, {
        // The document element does not exist yet when an init script runs, so watch the document
        attributes: true,
        subtree: true,
        attributeFilter: ["data-vt"],
      });
    });
    await page.goto(LAB);
    await waitForEngine(page);
    await page.evaluate(() => {
      (
        document.querySelector("header[data-chrome]") as HTMLElement & {
          __same?: boolean;
        }
      ).__same = true;
    });

    await page.getByRole("link", { name: "Second page" }).first().click();
    await expect(
      page.getByRole("heading", { level: 1, name: "Second page" })
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => (window as unknown as { __vtSeen: boolean }).__vtSeen
      )
    ).toBe(true);
    // The transition cleans up after itself
    await expect(page.locator("html")).not.toHaveAttribute("data-vt", /.+/);
    // The header node was never replaced
    expect(
      await page.evaluate(
        () =>
          (
            document.querySelector("header[data-chrome]") as HTMLElement & {
              __same?: boolean;
            }
          ).__same
      )
    ).toBe(true);
    await expect(page).toHaveURL(/\/lab\/motion\/next$/);
  });

  test("without View Transitions the settled page eases in instead", async ({
    page,
  }) => {
    await page.addInitScript(() => {
      // @ts-expect-error simulate a browser without the API
      document.startViewTransition = undefined;
    });
    await page.goto(LAB);
    await waitForEngine(page);
    await page.getByRole("link", { name: "Second page" }).first().click();
    await expect(page.locator("html")).toHaveAttribute("data-nav", "enter");
    await expect(
      page.getByRole("heading", { level: 1, name: "Second page" })
    ).toBeVisible();
    await expect(page.locator("html")).not.toHaveAttribute("data-nav", /.+/, {
      timeout: 3_000,
    });
  });

  test("magnetic and cursor follow the pointer on tier 3 and not on tier 2", async ({
    page,
  }) => {
    await page.goto(`${LAB}?tier=3`);
    await waitForEngine(page);
    const button = page.getByRole("button", { name: "Describe your problem" });
    await button.scrollIntoViewIfNeeded();
    const box = (await button.boundingBox())!;
    const parentBefore = await button.locator("xpath=..").boundingBox();

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.move(
      box.x + box.width / 2 + 24,
      box.y + box.height / 2 + 10,
      { steps: 6 }
    );
    await expect
      .poll(() =>
        button
          .locator("xpath=..")
          .evaluate((element) => getComputedStyle(element).transform)
      )
      .not.toBe("none");
    // The wrapper's layout box does not move (transform only)
    const parentAfter = await button.locator("xpath=..").boundingBox();
    expect(Math.abs(parentAfter!.width - parentBefore!.width)).toBeLessThan(1);

    await expect(page.locator("[data-cursor]")).toHaveAttribute(
      "data-cursor-visible",
      "true"
    );
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
      steps: 4,
    });
    await expect(page.locator("[data-cursor]")).toHaveAttribute(
      "data-cursor-state",
      "link"
    );

    await page.goto(`${LAB}?tier=2`);
    await waitForEngine(page);
    await expect(page.locator("[data-cursor]")).toHaveCount(0);
  });

  test("?debug=perf shows the frame overlay", async ({ page }) => {
    await page.goto(`${LAB}?debug=perf`);
    await waitForEngine(page);
    await expect(page.locator("[data-perf-overlay]")).toContainText(/fps \d+/, {
      timeout: 5_000,
    });
    await expect(page.locator("[data-perf-overlay]")).toContainText(
      "engine ready"
    );
  });
});

test.describe("command palette", () => {
  test("opens from the keyboard, searches, navigates and returns focus", async ({
    page,
  }) => {
    await page.goto("/about");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.keyboard.press("Control+K");

    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const box = dialog.getByRole("combobox", {
      name: "Search pages and settings",
    });
    await expect(box).toBeFocused();
    await expect(box).toHaveAttribute("aria-expanded", "true");

    await box.fill("contact");
    await expect(dialog.getByRole("option")).toHaveCount(1);
    await expect(dialog.getByRole("status")).toHaveText("1 result");
    const active = await box.getAttribute("aria-activedescendant");
    expect(active).toBeTruthy();
    await expect(
      dialog.getByRole("option", { name: /Contact/ })
    ).toHaveAttribute("id", active!);
    await expect(
      dialog.getByRole("option", { name: /Contact/ })
    ).toHaveAttribute("aria-selected", "true");

    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/contact$/);
    await expect(dialog).toBeHidden();
  });

  test("the header button opens it, Escape closes it and focus comes back", async ({
    page,
  }, testInfo) => {
    test.skip(
      isMobile(testInfo.project.name),
      "touch is covered by the phone-sized test below"
    );
    await page.goto("/about");
    const opener = page.getByRole("button", { name: "Open command palette" });
    await opener.focus();
    await opener.click();
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  });

  test("works on a phone-sized screen too", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "touch project only");
    await page.goto("/about");
    await page.getByRole("button", { name: "Open command palette" }).tap();
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    const box = dialog.getByRole("combobox");
    await box.fill("articles");
    await dialog.getByRole("option", { name: /Articles/ }).tap();
    await expect(page).toHaveURL(/\/articles$/);
  });

  test("runs a preference command and stops page scroll while open", async ({
    page,
  }) => {
    await page.goto("/about");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.keyboard.press("Control+K");
    const dialog = page.getByRole("dialog", { name: "Command palette" });
    await expect(dialog).toBeVisible({ timeout: 10_000 });
    expect(await page.evaluate(() => document.body.style.overflow)).toBe(
      "hidden"
    );

    await dialog.getByRole("combobox").fill("theme: light");
    await page.keyboard.press("Enter");
    await expect(page.locator("html")).toHaveClass(/light/);
    expect(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("setting") ?? "{}").theme
      )
    ).toBe("light");
    expect(await page.evaluate(() => document.body.style.overflow)).not.toBe(
      "hidden"
    );
  });

  test("has no accessibility violations while open", async ({ page }) => {
    await page.goto("/about");
    await page.getByRole("heading", { level: 1 }).waitFor();
    await page.keyboard.press("Control+K");
    await expect(
      page.getByRole("dialog", { name: "Command palette" })
    ).toBeVisible({ timeout: 10_000 });
    await settle(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(describeViolations(results.violations)).toEqual([]);
  });

  test("smooth scroll stops while the palette is open and resumes after", async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    await page.goto("/about");
    await waitForEngine(page);
    await page.keyboard.press("Control+K");
    await expect(
      page.getByRole("dialog", { name: "Command palette" })
    ).toBeVisible();
    await expect(page.locator("html")).toHaveClass(/lenis-stopped/);
    await page.keyboard.press("Escape");
    await expect(page.locator("html")).not.toHaveClass(/lenis-stopped/);
  });
});

test.describe("accessibility of the Motion lab", () => {
  test("full motion has no violations", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    await page.goto(LAB);
    await waitForEngine(page);
    await settle(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(describeViolations(results.violations)).toEqual([]);
  });

  test("reduced motion has no violations", async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(LAB);
    await waitForEngine(page, "off");
    await settle(page);
    const results = await new AxeBuilder({ page }).analyze();
    expect(describeViolations(results.violations)).toEqual([]);
    await context.close();
  });
});

test.describe("reduced parity", () => {
  test("the end frame of full motion equals the reduced render", async ({
    browser,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    const parity = "/lab/motion/parity";
    const viewport = { width: 1280, height: 800 };

    // Reduced: the server render, nothing animates
    const reducedContext = await browser.newContext({
      viewport,
      reducedMotion: "reduce",
    });
    const reducedPage = await reducedContext.newPage();
    await reducedPage.goto(parity);
    await waitForEngine(reducedPage, "off");
    await settle(reducedPage);
    const reduced = await reducedPage.screenshot({ fullPage: true });
    await reducedContext.close();

    // Full: scroll through so every reveal, line split and count-up runs, let it all finish, return
    const fullContext = await browser.newContext({ viewport });
    const fullPage = await fullContext.newPage();
    await fullPage.goto(parity);
    await waitForEngine(fullPage);
    await fullPage.mouse.move(640, 400);
    const height = await fullPage.evaluate(
      () => document.documentElement.scrollHeight
    );
    for (let y = 0; y < height; y += 240) {
      await fullPage.mouse.wheel(0, 240);
      await fullPage.waitForTimeout(110);
    }
    await fullPage.waitForTimeout(1_500);
    await settle(fullPage);
    await expect(fullPage.locator(".t-line")).toHaveCount(0);
    await expect(
      fullPage.locator("[data-reveal]:not([data-reveal-visible='true'])")
    ).toHaveCount(0);
    await fullPage.evaluate(() => window.scrollTo(0, 0));
    await fullPage.waitForTimeout(600);
    const full = await fullPage.screenshot({ fullPage: true });
    await fullContext.close();

    // Compare pixel by pixel with a small tolerance for anti-aliasing
    const decode = async (png: Buffer) => {
      const { data, info } = await sharp(png)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      return { data, width: info.width, height: info.height };
    };
    const [a, b] = await Promise.all([decode(reduced), decode(full)]);
    expect([b.width, b.height]).toEqual([a.width, a.height]);

    let different = 0;
    for (let index = 0; index < a.data.length; index += 4) {
      const delta = Math.max(
        Math.abs(a.data[index]! - b.data[index]!),
        Math.abs(a.data[index + 1]! - b.data[index + 1]!),
        Math.abs(a.data[index + 2]! - b.data[index + 2]!)
      );
      if (delta > 24) different += 1;
    }
    const ratio = different / (a.width * a.height);
    await testInfo.attach("reduced-render", {
      body: reduced,
      contentType: "image/png",
    });
    await testInfo.attach("full-motion-end-frame", {
      body: full,
      contentType: "image/png",
    });
    expect(ratio, `${different} pixels differ`).toBeLessThan(0.0005);
  });
});
