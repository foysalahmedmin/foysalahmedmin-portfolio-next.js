export const REVEAL_VARIANTS = [
  "fade",
  "up",
  "down",
  "left",
  "right",
  "scale",
  "skew-up",
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
