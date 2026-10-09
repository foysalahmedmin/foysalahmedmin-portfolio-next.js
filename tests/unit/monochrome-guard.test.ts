import { describe, expect, it } from "vitest";
import {
  parseRules,
  readRepoFile,
  readTokenFile,
  resolveColour,
  stripComments,
} from "../helpers/contrast";
import { readSource, walkFiles } from "../helpers/source-scan";

/**
 * Monochrome guard (docs plan 3.1, 3.6). The public surface may not contain a hue anywhere in its
 * token files, and no legacy colour token may reach the public surface un-remapped.
 */
const publicCss = walkFiles("src/assets/styles/public", [".css"]).map(
  readSource
);

const isNeutral = (r: number, g: number, b: number) => r === g && g === b;

const colourLiterals = (css: string) => {
  const text = stripComments(css);
  const found: Array<{ literal: string; neutral: boolean }> = [];
  for (const match of text.matchAll(/#[0-9a-fA-F]{3,8}\b/g)) {
    const hex = match[0].slice(1);
    const full =
      hex.length <= 4
        ? hex
            .split("")
            .map((c) => c + c)
            .join("")
        : hex;
    found.push({
      literal: match[0],
      neutral: isNeutral(
        parseInt(full.slice(0, 2), 16),
        parseInt(full.slice(2, 4), 16),
        parseInt(full.slice(4, 6), 16)
      ),
    });
  }
  for (const match of text.matchAll(
    /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)[^)]*\)/g
  )) {
    found.push({
      literal: match[0],
      neutral: isNeutral(Number(match[1]), Number(match[2]), Number(match[3])),
    });
  }
  for (const match of text.matchAll(/oklch\(\s*[\d.]+%?\s+([\d.]+)[^)]*\)/g)) {
    found.push({ literal: match[0], neutral: Number(match[1]) === 0 });
  }
  for (const match of text.matchAll(
    /hsla?\(\s*[\d.]+(?:deg)?[\s,]+([\d.]+)%[^)]*\)/g
  )) {
    found.push({ literal: match[0], neutral: Number(match[1]) === 0 });
  }
  return found;
};

describe("monochrome guard", () => {
  it("has no hue in any public token or style file", () => {
    const hues = publicCss.flatMap(({ path, text }) =>
      colourLiterals(text)
        .filter((entry) => !entry.neutral)
        .map((entry) => `${path}: ${entry.literal}`)
    );
    expect(hues).toEqual([]);
  });

  it("resolves every semantic colour token to a neutral on both tones", () => {
    const { ramp, ink, paper, shared } = readTokenFile();
    const leaks: string[] = [];
    for (const [tone, scope] of [
      ["ink", ink],
      ["paper", paper],
    ] as const) {
      for (const [name, value] of Object.entries(scope)) {
        if (!/^(var\(--|#|rgb)/.test(value) || name.startsWith("--glass-blur"))
          continue;
        if (/shadow|elev|edge/.test(name)) continue;
        try {
          const [r, g, b] = resolveColour(value, scope, shared, ramp);
          if (!isNeutral(r, g, b)) leaks.push(`${tone} ${name}`);
        } catch {
          /* non-colour values such as focus offsets are not colours */
        }
      }
    }
    expect(leaks).toEqual([]);
  });

  it("remaps every legacy colour token so no hue reaches the public surface", () => {
    const legacy = parseRules(
      readRepoFile("src/assets/styles/base/variables.css")
    );
    const hueful = new Set<string>();
    for (const rule of legacy) {
      for (const [name, value] of Object.entries(rule.declarations)) {
        const chroma = [
          ...value.matchAll(/oklch\(\s*[\d.]+%?\s+([\d.]+)/g),
        ].map((m) => Number(m[1]));
        if (name.startsWith("--") && chroma.some((c) => c > 0.001))
          hueful.add(name);
      }
    }
    expect(hueful.size).toBeGreaterThan(30);

    const { ink, paper, shared } = readTokenFile();
    const covered = (name: string, scope: Record<string, string>) =>
      name in scope || name in shared;
    const missing = [...hueful].filter(
      (name) => !covered(name, ink) || !covered(name, paper)
    );
    expect(missing).toEqual([]);
  });

  it("keeps the role accent inert: the five pillar colours collapse to one token", () => {
    const { shared } = readTokenFile();
    for (const pillar of [
      "frontend",
      "backend",
      "ai",
      "system",
      "full-stack",
    ]) {
      expect(shared[`--pillar-${pillar}`]).toBe("var(--foreground)");
    }
  });
});
