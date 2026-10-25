import { STAGGER, staggerDelay } from "./tokens";

export const REVEAL_VARIANTS = [
  "fade",
  "up",
  "down",
  "left",
  "right",
  "scale",
  "skew-up",
  /** Media wipe (M08): a cover panel retracts over a media wrapper, after the image has decoded (F7). */
  "wipe",
] as const;

export type RevealVariant = (typeof REVEAL_VARIANTS)[number];

const legacyVariants: Array<[string, RevealVariant]> = [
  ["fade-up", "up"],
  ["fade-down", "down"],
  ["fade-left", "left"],
  ["fade-right", "right"],
  ["scale-in", "scale"],
  ["skew-up", "skew-up"],
];

export function getRevealVariantFromClassNames(
  classNames: Iterable<string>
): RevealVariant | null {
  const classes = new Set(classNames);
  return legacyVariants.find(([name]) => classes.has(name))?.[1] ?? null;
}

export function normalizeRevealDelay(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1_200, Math.max(0, Math.round(value)));
}

/**
 * Stagger delay (ms) for item `index` of a reveal group. With the group size the whole group fits the
 * stagger budget; without it the delay is capped so a long list never trails behind the reader.
 */
export function revealStagger(index: number, count?: number): number {
  const position = Math.max(0, Math.floor(Number.isFinite(index) ? index : 0));
  if (count !== undefined) return staggerDelay(position, count);
  return Math.min(position * STAGGER.step, STAGGER.total);
}
