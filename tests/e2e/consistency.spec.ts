import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Cross-page consistency probe (docs plan 3.15). Visits every public route and compares computed
 * styles against docs/design-system/archetypes.json: header height, H1 family, size and weight,
 * container width and edge, page-header padding, CtaBand presence, tone and position, footer.
 * Drift fails the build. Public detail routes are discovered from their public list API and skipped when
 * the database has no published record.
 */
type Discover = { api: string; linkPrefix: string };
type Archetype = {
  name: string;
  /** false for pages rendered outside the public layout (unmatched URLs): no header, footer or grain. */
  shell?: boolean;
  pageHeader?: false | "index" | "detail" | "deferred";
  ctaBand?: boolean;
  routes?: string[];
  discover?: Discover | Discover[];
};
const contract = JSON.parse(
  readFileSync(
    join(process.cwd(), "docs/design-system/archetypes.json"),
    "utf8"
  )
) as {
  public: {
    shell: {
      headerHeightPx: number;
      containerMaxPx: number;
      gutterMinPx: number;
      gutterMaxPx: number;
      sectionCompactMinPx: number;
      sectionCompactMaxPx: number;
    };
    h1: Record<
      "index" | "detail",
      { minFontPx: number; minWeight: number; minStretchPct: number }
    >;
    archetypes: Record<string, Archetype>;
  };
};

const clamp = (min: number, value: number, max: number) =>
  Math.min(max, Math.max(min, value));

const discoverRoute = async (page: Page, source: Discover) => {
  const response = await page.request.get(source.api);
  if (!response.ok()) return null;
  const body = (await response.json()) as {
    data?: Array<{ slug?: string; _id?: string }>;
  };
  const record = body.data?.[0];
  const identifier = record?.slug ?? record?._id;
  return identifier ? `${source.linkPrefix}${identifier}` : null;
};

const probe = async (page: Page, id: string, spec: Archetype) => {
  const { shell, h1 } = contract.public;
  const viewport = page.viewportSize()!;

  await expect(page.locator("html")).toHaveAttribute("data-surface", "public");
  // Dynamic routes stream behind the archetype skeleton; probe the real page
  await expect(page.locator("main:not([aria-busy])")).toHaveCount(1);
  await expect(page.locator("main")).toHaveCount(1);
  await expect(page.locator("main")).toHaveAttribute("data-archetype", id);

  const facts = await page.evaluate(() => {
    const box = (element: Element | null) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return {
        left: rect.left,
        width: rect.width,
        height: rect.height,
        paddingTop: parseFloat(style.paddingTop),
        background: style.backgroundColor,
      };
    };
    const luminance = (rgb: string) => {
      const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ["0", "0", "0"]).map(
        Number
      ) as [number, number, number];
      const c = (v: number) => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * c(r) + 0.7152 * c(g) + 0.0722 * c(b);
    };
    const main = document.querySelector("main");
    const pageHeader = document.querySelector("[data-page-header]");
    const heading =
      pageHeader?.querySelector("h1") ?? document.querySelector("main h1");
    const heading_style = heading ? getComputedStyle(heading) : null;
    const cta = document.querySelector("[data-cta-band]");
    const chrome = document.querySelector("header[data-chrome]");
    const footer = document.querySelector("footer");
    const bodyBackground = getComputedStyle(document.body).backgroundColor;
    const pageBackground = main
      ? getComputedStyle(main.closest("[data-surface]") ?? document.body)
          .backgroundColor
      : bodyBackground;
    return {
      chrome: box(chrome),
      chromeContainer: box(chrome?.querySelector(".container") ?? null),
      pageHeader: box(pageHeader),
      pageHeaderContainer: box(pageHeader?.querySelector(".container") ?? null),
      h1: heading_style
        ? {
            fontSize: parseFloat(heading_style.fontSize),
            fontWeight: Number(heading_style.fontWeight),
            fontStretch: parseFloat(heading_style.fontStretch),
            fontFamily: heading_style.fontFamily,
          }
        : null,
      h1Count: document.querySelectorAll("h1").length,
      cta: box(cta),
      ctaTone: cta?.getAttribute("data-tone") ?? null,
      ctaIsLast: cta ? cta.nextElementSibling === null : null,
      ctaLuminance: cta
        ? luminance(
            getComputedStyle(cta).backgroundColor === "rgba(0, 0, 0, 0)"
              ? pageBackground
              : getComputedStyle(cta).backgroundColor
          )
        : null,
      pageLuminance: luminance(pageBackground),
      footer: box(footer),
      footerLuminance: footer
        ? luminance(getComputedStyle(footer).backgroundColor)
        : null,
      grainPointerEvents: (() => {
        const grain = document.querySelector(".grain");
        return grain ? getComputedStyle(grain).pointerEvents : null;
      })(),
      overflow:
        document.documentElement.scrollWidth -
        document.documentElement.clientWidth,
    };
  });

  const shellExpected = spec.shell !== false;
  if (!shellExpected) {
    expect(facts.chrome, "no shell outside the public layout").toBeNull();
    expect(facts.h1Count, "one H1 per page").toBe(1);
    expect(facts.overflow).toBeLessThanOrEqual(1);
    return;
  }

  // Shell: header height, one container edge from header to page header
  expect(facts.chrome, "shell header").not.toBeNull();
  expect(
    Math.abs(facts.chrome!.height - shell.headerHeightPx)
  ).toBeLessThanOrEqual(1);
  const gutter = clamp(
    shell.gutterMinPx,
    viewport.width * 0.03,
    shell.gutterMaxPx
  );
  const containerWidth = Math.min(
    viewport.width - 2 * gutter,
    shell.containerMaxPx
  );
  expect(
    Math.abs(facts.chromeContainer!.width - containerWidth)
  ).toBeLessThanOrEqual(1.5);

  // Page header
  if (spec.pageHeader === "index" || spec.pageHeader === "detail") {
    const level = h1[spec.pageHeader];
    expect(facts.pageHeader, "page header").not.toBeNull();
    expect(facts.h1Count, "exactly one H1").toBe(1);
    expect(facts.h1!.fontSize).toBeGreaterThanOrEqual(level.minFontPx);
    expect(facts.h1!.fontWeight).toBeGreaterThanOrEqual(level.minWeight);
    expect(facts.h1!.fontStretch).toBeGreaterThanOrEqual(level.minStretchPct);
    expect(facts.h1!.fontFamily.toLowerCase()).toContain("display");
    expect(
      Math.abs(facts.pageHeaderContainer!.left - facts.chromeContainer!.left)
    ).toBeLessThanOrEqual(1);
    expect(
      Math.abs(facts.pageHeaderContainer!.width - containerWidth)
    ).toBeLessThanOrEqual(1.5);
    const expectedPadding = clamp(
      shell.sectionCompactMinPx,
      viewport.width * 0.05,
      shell.sectionCompactMaxPx
    );
    expect(
      Math.abs(facts.pageHeader!.paddingTop - expectedPadding)
    ).toBeLessThanOrEqual(1);
  } else if (spec.pageHeader === false) {
    expect(facts.pageHeader, "no private page header").toBeNull();
  }
  expect(facts.h1Count, "one H1 per page").toBe(1);

  // CtaBand: present or absent, inverted tone, last in the page body
  if (spec.ctaBand) {
    expect(facts.cta, "CtaBand").not.toBeNull();
    expect(facts.ctaTone).toBe("invert");
    expect(Math.abs(facts.ctaLuminance! - facts.pageLuminance)).toBeGreaterThan(
      0.3
    );
    expect(facts.ctaIsLast).toBe(true);
  } else {
    expect(facts.cta, "no CtaBand").toBeNull();
  }

  // Footer returns to the page tone
  expect(facts.footer, "footer").not.toBeNull();
  expect(Math.abs(facts.footerLuminance! - facts.pageLuminance)).toBeLessThan(
    0.05
  );
  expect(facts.grainPointerEvents).toBe("none");
  expect(facts.overflow).toBeLessThanOrEqual(1);
};

for (const theme of ["dark", "light"] as const) {
  test.describe(`${theme} theme`, () => {
    test.beforeEach(async ({ page }) => {
      await page.addInitScript((value) => {
        localStorage.setItem(
          "setting",
          JSON.stringify({ theme: value, direction: "ltr", language: "en" })
        );
      }, theme);
    });

    for (const [id, spec] of Object.entries(contract.public.archetypes)) {
      for (const route of spec.routes ?? []) {
        test(`${id} ${spec.name}: ${route}`, async ({ page }) => {
          await page.goto(route);
          await page.evaluate(() => document.fonts.ready);
          await probe(page, id, spec);
        });
      }

      const sources = spec.discover ? [spec.discover].flat() : [];
      for (const source of sources) {
        test(`${id} ${spec.name}: first ${source.linkPrefix} record`, async ({
          page,
        }) => {
          const href = await discoverRoute(page, source);
          test.skip(
            !href,
            `no published record under ${source.linkPrefix} in this database`
          );
          await page.goto(href!);
          await page.evaluate(() => document.fonts.ready);
          await probe(page, id, spec);
        });
      }
    }
  });
}
