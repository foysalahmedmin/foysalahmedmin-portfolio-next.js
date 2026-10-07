export type BalancedGridDensity = "compact" | "roomy";

// Picks column classes that fill every row, so a short set of cards never
// ends with a single card stranded on its own line. Class names are spelled out
// in full so Tailwind can see them at build time.
//
// `compact` is for short cards, `roomy` for cards that carry several lists
// and need more width before they can sit side by side.
export const getBalancedGridClass = (
  count: number,
  density: BalancedGridDensity = "compact"
): string => {
  if (count === 1) return "grid-cols-1";

  if (density === "roomy") {
    if (count === 3) return "xl:grid-cols-3";
    return "lg:grid-cols-2";
  }

  if (count === 2) return "md:grid-cols-2";
  if (count === 3) return "lg:grid-cols-3";
  if (count === 4) return "md:grid-cols-2 xl:grid-cols-4";
  if (count === 5) return "md:grid-cols-2 xl:grid-cols-5";
  return "md:grid-cols-2 xl:grid-cols-3";
};
