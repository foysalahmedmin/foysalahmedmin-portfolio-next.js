import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

export const REPO_ROOT = process.cwd();

export const walkFiles = (
  directory: string,
  extensions: readonly string[]
): string[] => {
  const output: string[] = [];
  const visit = (current: string) => {
    for (const name of readdirSync(current)) {
      const path = join(current, name);
      if (statSync(path).isDirectory()) visit(path);
      else if (
        extensions.some((extension) => name.endsWith(extension)) &&
        !name.endsWith(".d.ts")
      ) {
        output.push(path);
      }
    }
  };
  visit(join(REPO_ROOT, directory));
  return output;
};

export const readSource = (absolutePath: string) => ({
  path: relative(REPO_ROOT, absolutePath).split("\\").join("/"),
  text: readFileSync(absolutePath, "utf8"),
});

const HUES =
  "red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|slate|gray|zinc|neutral|stone";

/** The token-only rules of docs plan 3.15, one regular expression each. */
export const DESIGN_RULES = {
  /** Tailwind palette utilities carry a hue (or a fixed grey that bypasses the tokens). */
  palette: new RegExp(
    `\\b(?:bg|text|border|ring|from|to|via|fill|stroke|shadow|outline|decoration|divide|accent|caret|placeholder)-(?:${HUES})-\\d{2,3}\\b`,
    "g"
  ),
  /** Colour literals belong in token files only. */
  literal:
    /#[0-9a-fA-F]{3,8}\b(?![\w-])|\b(?:rgba?|hsla?|oklch|oklab|lab|lch)\(/g,
  /** Arbitrary radius, shadow and background values that do not reference a token. */
  arbitrary:
    /\b(?:rounded|shadow|bg)-\[(?!var\(|image:var\(|length:var\(|color:var\(|position:|--|url\()[^\]]+\]/g,
  /** Large radii are the "rounded card" look; the surfaces own radius through tokens. */
  "rounded-large": /\brounded(?:-[a-z]{1,2})?-(?:2xl|3xl)\b/g,
} as const;

export type DesignRule = keyof typeof DESIGN_RULES;

export const scanDesignRules = (
  text: string
): Partial<Record<DesignRule, number>> => {
  const found: Partial<Record<DesignRule, number>> = {};
  for (const [rule, pattern] of Object.entries(DESIGN_RULES) as Array<
    [DesignRule, RegExp]
  >) {
    const matches = text.match(pattern);
    if (matches?.length) found[rule] = matches.length;
  }
  return found;
};
