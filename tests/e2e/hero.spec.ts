import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import sharp from "sharp";
import { settle } from "./support/settle";

/**
 * Phase 3 acceptance in a real browser (docs plan Phase 3): the hero is complete without JavaScript,
 * T0 and T1 render the poster only, the canvas is live at T2 and T3, pauses off screen and unmounts, the
 * scroll story works over the poster when there is no WebGL, and the glass header stays legible over the
 * canvas. `?tier=N` is the QA override; it is honoured exactly and switches the governor off.
 */
const KICKER = "Business problems in. Reliable systems out.";
const ROLES = [
  /System\s+Architect/,
  /Software\s+Developer/,
  /AI\s+Automation\s+Developer/,
];
const LIVE_TIMEOUT = 60_000;

const isMobile = (name: string) => name === "chromium-mobile";

/** Records every script that contains the Three.js renderer, whichever chunk it lands in. */
function trackSceneChunks(page: Page) {
  const loaded: string[] = [];
  page.on("response", async (response) => {
    const url = response.url();
    if (!/\/_next\/static\/.*\.js(\?|$)/.test(url)) return;
    try {
      if (/WebGLRenderer/.test(await response.text())) loaded.push(url);
    } catch {
      /* the response was aborted */
    }
  });
  return loaded;
}

const setTheme = (page: Page, theme: "dark" | "light") =>
  page.addInitScript((value) => {
    localStorage.setItem(
      "setting",
      JSON.stringify({ theme: value, direction: "ltr", language: "en" })
    );
  }, theme);

const hero = (page: Page) => page.locator("section[data-hero]");
const canvasHost = (page: Page) => page.locator("[data-hero-canvas]");

/** Scrolls so the hero's story is at `progress` (0 to 1) of its track. */
const scrollStory = (page: Page, progress: number) =>
  page.evaluate((value) => {
    const section = document.querySelector<HTMLElement>("section[data-hero]")!;
    const top = section.getBoundingClientRect().top + window.scrollY;
    const room = section.offsetHeight - window.innerHeight;
    window.scrollTo(0, top + room * value);
  }, progress);

/**
 * Scrolls to `progress` and waits for the story to be on `beat`. The scroll is repeated while polling:
 * the pin measures its track again when late media or fonts land, and a scroll made just before that
 * lands on the old geometry.
 */
const expectBeatAt = (page: Page, progress: number, beat: string) =>
  expect
    .poll(
      async () => {
        await scrollStory(page, progress);
        return hero(page).getAttribute("data-beat");
      },
      { timeout: 20_000, intervals: [250, 500, 1_000] }
    )
    .toBe(beat);

async function openHome(page: Page, query = "") {
  await page.goto(`/${query}`);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("main")).not.toHaveAttribute("aria-busy", "true");
  await expect(hero(page)).toBeVisible();
}

/**
 * What a visitor without JavaScript, a crawler or a reader mode receives is the server HTML. Every
 * public page ships inside React's Suspense boundary for its `loading.tsx`, so the finished page sits in
 * a hidden segment that a small inline script moves into place; that is true of every route and is
 * recorded in the Phase 3 findings. This test therefore reads the HTML itself: the hero must be
 * complete in it, in reading order, with no dependence on the engine or the canvas.
 */
test.describe("hero in the server HTML", () => {
  test("is the whole story: kicker, actions, three roles in order, and both posters", async ({
    request,
  }) => {
    const html = await (await request.get("/")).text();
    const hero = html.slice(html.indexOf("data-hero"));
    expect(hero.length).toBeGreaterThan(0);

    const order = [
      KICKER,
      "Describe your problem",
      "See how I work",
      ...ROLES.map((role) => role.source),
    ].map((needle, index) => {
      const pattern =
        index < 3
          ? new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
          : new RegExp(needle);
      return hero.search(pattern);
    });
    expect(order.every((position) => position >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    // Nothing in the markup is pinned or hidden by script: that state only exists after the engine runs
    expect(hero).not.toMatch(/data-pinned="true"/);
    for (const theme of ["dark", "light"]) {
      for (const frame of ["landscape", "portrait"]) {
        expect(hero).toContain(`/images/hero/maquette-${theme}-${frame}.avif`);
      }
    }
    expect((hero.match(/<h2/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });
});

test.describe("poster tiers (T0 and T1)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium only");

  for (const tier of [0, 1]) {
    test(`?tier=${tier} renders the poster only and never fetches the 3D chunk`, async ({
      page,
    }, testInfo) => {
      test.skip(isMobile(testInfo.project.name), "desktop only");
      const chunks = trackSceneChunks(page);
      await openHome(page, `?tier=${tier}`);
      await expect(page.locator("html")).toHaveAttribute(
        "data-tier",
        String(tier)
      );
      await page.waitForTimeout(3_000);
      await expect(canvasHost(page)).not.toHaveAttribute(
        "data-scene-state",
        /live|loading|paused/
      );
      await expect(canvasHost(page).locator("canvas")).toHaveCount(0);
      expect(chunks).toEqual([]);
      // Without the engine the roles simply stack
      await expect(hero(page)).not.toHaveAttribute("data-pinned", /.*/);
      for (const role of ROLES) {
        await expect(
          hero(page).getByRole("heading", { level: 2, name: role })
        ).toBeVisible();
      }
    });
  }

  test("reduced motion keeps the poster and the stacked roles, and never loads Three", async ({
    browser,
  }) => {
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    const chunks = trackSceneChunks(page);
    await openHome(page);
    await page.waitForTimeout(3_000);
    await expect(canvasHost(page).locator("canvas")).toHaveCount(0);
    await expect(hero(page)).not.toHaveAttribute("data-pinned", /.*/);
    expect(chunks).toEqual([]);
    await context.close();
  });
});

test.describe("live canvas (T2 and T3)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium only");
  test.setTimeout(150_000);

  test("?tier=3 goes live within the scene budget, then pauses off screen, unmounts, and returns", async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    const chunks = trackSceneChunks(page);
    await openHome(page, "?tier=3");

    await expect(canvasHost(page)).toHaveAttribute("data-scene-state", "live", {
      timeout: LIVE_TIMEOUT,
    });
    expect(chunks.length).toBeGreaterThan(0);
    await expect(canvasHost(page).locator("canvas")).toHaveCount(1);
    const counts = await canvasHost(page).evaluate((element) => ({
      calls: Number(element.getAttribute("data-scene-calls")),
      triangles: Number(element.getAttribute("data-scene-triangles")),
    }));
    // Plan 6.2: at most 40 draw calls and 150k triangles
    expect(counts.calls).toBeGreaterThan(0);
    expect(counts.calls).toBeLessThanOrEqual(40);
    expect(counts.triangles).toBeLessThanOrEqual(150_000);

    // Past the hero, the canvas stops drawing, and a few seconds later gives its GPU memory back
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(canvasHost(page)).toHaveAttribute(
      "data-scene-state",
      "paused",
      {
        timeout: 10_000,
      }
    );
    await expect(canvasHost(page)).toHaveAttribute(
      "data-scene-state",
      "released",
      { timeout: 10_000 }
    );
    await expect(canvasHost(page).locator("canvas")).toHaveCount(0);

    // Back at the top it is recreated
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(canvasHost(page)).toHaveAttribute("data-scene-state", "live", {
      timeout: LIVE_TIMEOUT,
    });
    await expect(canvasHost(page).locator("canvas")).toHaveCount(1);
  });

  test("the story advances beat by beat over the live canvas", async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    await openHome(page, "?tier=3");
    await expect(canvasHost(page)).toHaveAttribute("data-scene-state", "live", {
      timeout: LIVE_TIMEOUT,
    });
    await expect(hero(page)).toHaveAttribute("data-pinned", "true", {
      timeout: 20_000,
    });
    for (const [progress, beat] of [
      [0.02, "0"],
      [0.5, "1"],
      [0.97, "2"],
    ] as const) {
      await expectBeatAt(page, progress, beat);
    }
  });

  test("a phone gets the simplified canvas without the motion engine", async ({
    page,
  }, testInfo) => {
    test.skip(!isMobile(testInfo.project.name), "phone only");
    const chunks = trackSceneChunks(page);
    await openHome(page, "?tier=2");
    await expect(canvasHost(page)).toHaveAttribute("data-scene-state", "live", {
      timeout: LIVE_TIMEOUT,
    });
    expect(chunks.length).toBeGreaterThan(0);
    // Touch never loads the engine, so nothing is pinned
    await expect(page.locator("html")).not.toHaveAttribute(
      "data-motion-engine",
      "ready"
    );
    await expect(hero(page)).not.toHaveAttribute("data-pinned", /.*/);
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("no WebGL (software renderer)", () => {
  test.skip(({ browserName }) => browserName !== "chromium", "Chromium only");

  test("the probe sends a software renderer to the poster, and the same three beats play over it", async ({
    page,
  }, testInfo) => {
    test.skip(isMobile(testInfo.project.name), "desktop only");
    const chunks = trackSceneChunks(page);
    await openHome(page);
    await expect(page.locator("html")).toHaveAttribute(
      "data-motion-engine",
      "ready",
      { timeout: 20_000 }
    );
    await expect(canvasHost(page)).toHaveAttribute("data-scene-gpu", /.+/, {
      timeout: 20_000,
    });
    const gpu = await canvasHost(page).getAttribute("data-scene-gpu");
    test.skip(
      gpu === "gpu",
      "this machine has a real GPU, so the canvas is allowed"
    );

    await expect(page.locator("html")).toHaveAttribute("data-tier", "1");
    await expect(canvasHost(page)).toHaveAttribute(
      "data-scene-state",
      "poster"
    );
    await expect(canvasHost(page).locator("canvas")).toHaveCount(0);
    expect(chunks).toEqual([]);

    // The engine is already running, so the pinned story works over the poster
    await expect(hero(page)).toHaveAttribute("data-pinned", "true");
    for (const [progress, beat] of [
      [0.02, "0"],
      [0.5, "1"],
      [0.97, "2"],
    ] as const) {
      await expectBeatAt(page, progress, beat);
      // The beat that is on stage is readable; the others take no focus
      await expect(
        hero(page).locator(`[data-pin-beat="${beat}"]`)
      ).not.toHaveAttribute("inert", /.*/);
    }
  });
});

for (const theme of ["dark", "light"] as const) {
  test.describe(`glass over the canvas (${theme})`, () => {
    test.skip(({ browserName }) => browserName !== "chromium", "Chromium only");
    test.setTimeout(150_000);

    test("header text stays legible over the live scene and passes axe", async ({
      page,
    }, testInfo) => {
      test.skip(isMobile(testInfo.project.name), "desktop only");
      await setTheme(page, theme);
      await openHome(page, "?tier=3");
      await expect(canvasHost(page)).toHaveAttribute(
        "data-scene-state",
        "live",
        { timeout: LIVE_TIMEOUT }
      );
      await settle(page);

      const header = page.locator("header[data-chrome]");
      const textColour = await header
        .locator("a")
        .first()
        .evaluate((element) => getComputedStyle(element).color);
      // Keep the glass, drop what is drawn on it, then read the pixels behind where the text sits
      await header.evaluate((element) =>
        element
          .querySelectorAll<HTMLElement>("*")
          .forEach((child) => (child.style.visibility = "hidden"))
      );
      const box = (await header.boundingBox())!;
      const shot = await page.screenshot({
        clip: { x: 0, y: 0, width: box.width, height: box.height },
      });
      await header.evaluate((element) =>
        element
          .querySelectorAll<HTMLElement>("*")
          .forEach((child) => (child.style.visibility = ""))
      );
      const { data, info } = await sharp(shot)
        .raw()
        .toBuffer({ resolveWithObject: true });

      const channel = (value: number) => {
        const s = value / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      const luminance = (r: number, g: number, b: number) =>
        0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
      const [tr, tg, tb] = (textColour.match(/[\d.]+/g) ?? []).map(Number) as [
        number,
        number,
        number,
      ];
      const text = luminance(tr, tg, tb);
      const ratios: number[] = [];
      for (let offset = 0; offset < data.length; offset += info.channels * 7) {
        const background = luminance(
          data[offset]!,
          data[offset + 1]!,
          data[offset + 2]!
        );
        const [hi, lo] = [text, background].sort((a, b) => b - a);
        ratios.push((hi! + 0.05) / (lo! + 0.05));
      }
      ratios.sort((a, b) => a - b);
      // The worst one percent of the pixels behind the header still meets AA for text
      expect(ratios[Math.floor(ratios.length * 0.01)]).toBeGreaterThanOrEqual(
        4.5
      );

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
  });
}
