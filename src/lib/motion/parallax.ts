export function clampUnit(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

export function calculateSectionProgress(input: {
  top: number;
  height: number;
  viewport_height: number;
}): number {
  const height = Math.max(1, input.height);
  const viewportHeight = Math.max(1, input.viewport_height);
  return clampUnit((viewportHeight - input.top) / (viewportHeight + height));
}

export function normalizePointer(value: number, size: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(size) || size <= 0) return 0;
  return Math.min(1, Math.max(-1, (value / size) * 2 - 1));
}
