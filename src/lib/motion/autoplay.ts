export const AUTOPLAY_PAUSE_REASONS = [
  "user",
  "hover",
  "focus",
  "hidden",
  "reduced-motion",
  "offscreen",
] as const;

export type AutoplayPauseReason = (typeof AUTOPLAY_PAUSE_REASONS)[number];

export function updatePauseReasons(
  reasons: ReadonlySet<AutoplayPauseReason>,
  reason: AutoplayPauseReason,
  paused: boolean
): ReadonlySet<AutoplayPauseReason> {
  const next = new Set(reasons);
  if (paused) next.add(reason);
  else next.delete(reason);
  return next;
}

export function shouldAutoplay(input: {
  item_count: number;
  pause_reasons: ReadonlySet<AutoplayPauseReason>;
}): boolean {
  return input.item_count > 1 && input.pause_reasons.size === 0;
}

export function getWrappedIndex(
  index: number,
  itemCount: number,
  direction: 1 | -1
): number {
  if (!Number.isFinite(itemCount) || itemCount <= 0) return 0;
  const normalizedCount = Math.floor(itemCount);
  const current = Number.isFinite(index) ? Math.floor(index) : 0;
  return (current + direction + normalizedCount) % normalizedCount;
}
