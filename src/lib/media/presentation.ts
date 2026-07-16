export type TMediaFocalPoint = Readonly<{
  x: number;
  y: number;
}>;

type TMediaAccessibilityMetadata = Readonly<{
  alt_text?: unknown;
  is_decorative?: unknown;
}>;

const DOMINANT_COLOR_PATTERN = /^#[a-f0-9]{6}$/i;
const BLUR_DATA_URL_PATTERN =
  /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;
const MAX_ALT_TEXT_LENGTH = 300;
const MAX_BLUR_DATA_URL_LENGTH = 8192;

export const normalizeMediaDimension = (value: unknown): number | undefined =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? value
    : undefined;

export const normalizeMediaFocalPoint = (
  value: unknown
): TMediaFocalPoint | undefined => {
  if (!value || typeof value !== "object") return undefined;
  const point = value as Record<string, unknown>;
  if (
    typeof point.x !== "number" ||
    !Number.isFinite(point.x) ||
    point.x < 0 ||
    point.x > 1 ||
    typeof point.y !== "number" ||
    !Number.isFinite(point.y) ||
    point.y < 0 ||
    point.y > 1
  ) {
    return undefined;
  }
  return { x: point.x, y: point.y };
};

export const normalizeMediaDominantColor = (
  value: unknown
): string | undefined => {
  if (typeof value !== "string") return undefined;
  const color = value.trim();
  return DOMINANT_COLOR_PATTERN.test(color) ? color.toLowerCase() : undefined;
};

export const normalizeMediaBlurDataUrl = (
  value: unknown
): string | undefined => {
  if (typeof value !== "string") return undefined;
  const dataUrl = value.trim();
  return dataUrl.length <= MAX_BLUR_DATA_URL_LENGTH &&
    BLUR_DATA_URL_PATTERN.test(dataUrl)
    ? dataUrl
    : undefined;
};

export const normalizeMediaAltText = (value: unknown): string | undefined => {
  if (typeof value !== "string") return undefined;
  const alt = value.trim();
  return alt && alt.length <= MAX_ALT_TEXT_LENGTH ? alt : undefined;
};

/**
 * File metadata is the only public-rendering authority for managed-media
 * accessibility. The fallback is used only when no managed File exists, so
 * Site/Pillar copy can never become a second rendered alt-text source.
 */
export const resolveMediaAlt = (
  media: TMediaAccessibilityMetadata | null | undefined,
  missingMediaFallback = ""
): string => {
  if (!media) return normalizeMediaAltText(missingMediaFallback) ?? "";
  if (media.is_decorative === true) return "";
  return normalizeMediaAltText(media.alt_text) ?? "";
};

export const toMediaObjectPosition = (focalPoint: TMediaFocalPoint): string => {
  const percentage = (coordinate: number) =>
    Math.round(coordinate * 10_000) / 100;
  return `${percentage(focalPoint.x)}% ${percentage(focalPoint.y)}%`;
};
