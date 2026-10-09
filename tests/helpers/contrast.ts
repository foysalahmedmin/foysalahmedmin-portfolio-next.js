import { readFileSync } from "node:fs";
import { join } from "node:path";

/** WCAG 2.x helpers and a tiny CSS custom-property reader for the Signal token files. */

export type Rgb = readonly [number, number, number];
export type Rgba = readonly [number, number, number, number];

export const readRepoFile = (path: string): string =>
  readFileSync(join(process.cwd(), path), "utf8");

export const TOKENS_CSS = "src/assets/styles/public/tokens.css";

export const stripComments = (css: string): string =>
  css.replace(/\/\*[\s\S]*?\*\//g, "");

export const parseHex = (hex: string): Rgb => {
  const value = hex.replace("#", "");
  const full =
    value.length === 3
      ? value
          .split("")
          .map((c) => c + c)
          .join("")
      : value;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
};

const channel = (value: number): number => {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
};

export const luminance = ([r, g, b]: Rgb): number =>
  0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);

export const contrast = (a: Rgb, b: Rgb): number => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
};

/** Composite a translucent foreground over an opaque backdrop in gamma space, as browsers do. */
export const over = ([r, g, b, a]: Rgba, backdrop: Rgb): Rgb => [
  Math.round(r * a + backdrop[0] * (1 - a)),
  Math.round(g * a + backdrop[1] * (1 - a)),
  Math.round(b * a + backdrop[2] * (1 - a)),
];

/** `rgb(255 255 255 / 0.08)` or `rgb(255 255 255)` */
export const parseRgbFunction = (value: string): Rgba => {
  const match = value.match(
    /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:\s*[/,]\s*([\d.]+))?\s*\)/
  );
  if (!match) throw new Error(`Not an rgb() colour: ${value}`);
  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    match[4] === undefined ? 1 : Number(match[4]),
  ];
};

export type Declarations = Record<string, string>;

/** Every `selector { declarations }` rule outside @media, in source order. */
export const parseRules = (
  css: string
): Array<{ selector: string; declarations: Declarations }> => {
  const rules: Array<{ selector: string; declarations: Declarations }> = [];
  const pattern = /([^{}]+)\{([^{}]*)\}/g;
  for (const match of stripComments(css).matchAll(pattern)) {
    const declarations: Declarations = {};
    for (const part of match[2]!.split(";")) {
      const index = part.indexOf(":");
      if (index < 0) continue;
      declarations[part.slice(0, index).trim()] = part
        .slice(index + 1)
        .replace(/\s+/g, " ")
        .trim();
    }
    rules.push({
      selector: match[1]!.replace(/\s+/g, " ").trim(),
      declarations,
    });
  }
  return rules;
};

export const readTokenFile = () => {
  const rules = parseRules(readRepoFile(TOKENS_CSS));
  const find = (needle: string) => {
    const rule = rules.find((r) => r.selector.includes(needle));
    if (!rule) throw new Error(`No rule with selector containing ${needle}`);
    return rule.declarations;
  };
  const ramp = find(":root");
  return {
    rules,
    ramp,
    ink: find('.dark [data-surface="public"]'),
    paper: find(':root:not(.dark) [data-surface="public"]'),
    shared: find(
      '[data-surface="public"], [data-surface="console"], [data-tone]'
    ),
  };
};

/** Resolve `var(--x)` chains against the ramp and a semantic block into an opaque colour. */
export const resolveColour = (
  value: string,
  ...scopes: Declarations[]
): Rgba => {
  const seen = new Set<string>();
  let current = value;
  for (;;) {
    const ref = current.match(/^var\((--[\w-]+)\)$/);
    if (!ref) break;
    const name = ref[1]!;
    if (seen.has(name)) throw new Error(`Cyclic token ${name}`);
    seen.add(name);
    const next = scopes
      .map((scope) => scope[name])
      .find((v) => v !== undefined);
    if (next === undefined) throw new Error(`Unresolved token ${name}`);
    current = next;
  }
  if (current.startsWith("#")) return [...parseHex(current), 1];
  return parseRgbFunction(current);
};
