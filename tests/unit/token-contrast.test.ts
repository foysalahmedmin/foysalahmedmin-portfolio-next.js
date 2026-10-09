import { describe, expect, it } from "vitest";
import { MONO_RAMP } from "@/lib/design/mono-ramp";
import {
  contrast,
  over,
  parseHex,
  readTokenFile,
  resolveColour,
  type Rgb,
} from "../helpers/contrast";

/**
 * Contrast is computed from the real token file, not from numbers copied into a test
 * (docs/plans/2026-10-08-monochrome-systems-ui-overhaul.md, 3.2 and 3.5).
 */
const { ramp, ink, paper } = readTokenFile();

const mono = (step: string): Rgb => parseHex(ramp[`--mono-${step}`]!);
const colour = (scope: Record<string, string>, token: string): Rgb => {
  const [r, g, b] = resolveColour(scope[token]!, scope, ramp);
  return [r, g, b];
};

describe("monochrome ramp", () => {
  it("matches the data used by the System lab (tokens.css is the source of truth)", () => {
    for (const { step, hex } of MONO_RAMP) {
      const key = `--mono-${step}`;
      expect(ramp[key], key).toBe(hex);
    }
  });

  it("is pure neutral and strictly ordered from white to void", () => {
    const steps = [
      "white",
      "50",
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950",
      "void",
    ];
    const values = steps.map((step) => mono(step));
    for (const [r, g, b] of values) {
      expect(r).toBe(g);
      expect(g).toBe(b);
    }
    for (let i = 1; i < values.length; i += 1) {
      expect(values[i]![0]).toBeLessThan(values[i - 1]![0]);
    }
  });
});

describe.each([
  ["ink (dark)", ink],
  ["paper (light)", paper],
] as const)("semantic pairs on %s", (_name, scope) => {
  it.each([
    ["foreground", "background", 18],
    ["card-foreground", "card", 15],
    ["popover-foreground", "popover", 15],
    ["primary-foreground", "primary", 15],
    ["secondary-foreground", "secondary", 12],
    ["accent-foreground", "accent", 12],
    ["destructive-foreground", "destructive", 12],
    ["success-foreground", "success", 12],
    ["warning-foreground", "warning", 7],
    ["info-foreground", "info", 5.5],
    ["text-secondary", "background", 9],
    ["muted-foreground", "background", 5.7],
    ["muted-foreground", "surface-subtle", 5.3],
  ] as const)("%s on %s is at least %s:1", (fg, bg, minimum) => {
    expect(
      contrast(colour(scope, `--${fg}`), colour(scope, `--${bg}`))
    ).toBeGreaterThanOrEqual(minimum);
  });

  it("keeps control borders at 3:1 against the page (WCAG 1.4.11)", () => {
    const border = resolveColour(scope["--line-4"]!, scope, ramp);
    const page = colour(scope, "--background");
    expect(contrast(over(border, page), page)).toBeGreaterThanOrEqual(3);
  });

  it("keeps decorative faint text readable on the page (informational minimum 3:1)", () => {
    expect(
      contrast(colour(scope, "--text-faint"), colour(scope, "--background"))
    ).toBeGreaterThanOrEqual(3.4);
  });
});

describe("focus ring", () => {
  it("one of the two rings contrasts at 3:1 with every grey in the ramp", () => {
    const ringInk = colour(ink, "--focus-ink");
    const ringPaper = colour(paper, "--focus-ink");
    for (const step of [
      "50",
      "100",
      "200",
      "300",
      "400",
      "500",
      "600",
      "700",
      "800",
      "900",
      "950",
    ]) {
      const surface = mono(step);
      const best = Math.max(
        contrast(ringInk, surface),
        contrast(ringPaper, surface)
      );
      expect(best, `ring over mono-${step}`).toBeGreaterThanOrEqual(3);
    }
  });
});

describe("glass (docs 3.5)", () => {
  const alpha = (value: string) => resolveColour(value, ink, ramp)[3];

  it("keeps dark glass under body text at alpha 0.08 or less", () => {
    expect(alpha(ink["--glass-1-bg"]!)).toBeLessThanOrEqual(0.08);
    expect(alpha(ink["--glass-2-bg"]!)).toBeLessThanOrEqual(0.08);
  });

  it("limits glass-3 to alpha 0.12 and only over the overlay scrim", () => {
    expect(alpha(ink["--glass-3-bg"]!)).toBeLessThanOrEqual(0.12);
    // The overlay keeps the backdrop at or below mono-800
    const scrim = resolveColour(ink["--overlay"]!, ink, ramp);
    expect(scrim[3]).toBeGreaterThanOrEqual(0.7);
  });

  it("passes AA for text over dark glass on the backdrop ceiling (mono-700)", () => {
    const ceiling = mono("700");
    const glass = resolveColour(ink["--glass-2-bg"]!, ink, ramp);
    const surface = over(glass, ceiling);
    expect(contrast(mono("50"), surface)).toBeGreaterThanOrEqual(7);
    expect(contrast(mono("300"), surface)).toBeGreaterThanOrEqual(4.5);
  });

  it("fails by design when the backdrop is lighter than the ceiling (guards the rule)", () => {
    const glass = resolveColour(ink["--glass-2-bg"]!, ink, ramp);
    expect(contrast(mono("300"), over(glass, mono("500")))).toBeLessThan(4.5);
  });

  it("passes AA for glass-3 text over the scrimmed backdrop (mono-800)", () => {
    const glass = resolveColour(ink["--glass-3-bg"]!, ink, ramp);
    const surface = over(glass, mono("800"));
    expect(contrast(mono("50"), surface)).toBeGreaterThanOrEqual(9);
    expect(contrast(mono("300"), surface)).toBeGreaterThanOrEqual(6);
  });

  it("passes AA for light glass with mono-700 text over a backdrop lighter than mono-500", () => {
    const glass = resolveColour(paper["--glass-2-bg"]!, paper, ramp);
    expect(glass[3]).toBeGreaterThanOrEqual(0.7);
    expect(
      contrast(mono("700"), over(glass, mono("500")))
    ).toBeGreaterThanOrEqual(4.5);
  });
});
