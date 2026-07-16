import type { TFile, TFileAttribution, TFileMetadataIssue } from "./file.type";

const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const DOMINANT_COLOR_PATTERN = /^#[a-f0-9]{6}$/;
const BLUR_DATA_URL_PATTERN =
  /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;

const CREDIT_REQUIRED_LICENSES = new Set<
  NonNullable<TFileAttribution["license"]>
>(["cc-by-4.0", "cc-by-sa-4.0", "unsplash", "other"]);

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isPositiveDimension = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const isRasterFile = (file: Partial<TFile>): boolean =>
  file.metadata?.file_type === "image" ||
  (typeof file.mimetype === "string" && file.mimetype.startsWith("image/"));

const hasValidFocalPoint = (file: Partial<TFile>): boolean => {
  const point = file.focal_point;
  return Boolean(
    point &&
      Number.isFinite(point.x) &&
      point.x >= 0 &&
      point.x <= 1 &&
      Number.isFinite(point.y) &&
      point.y >= 0 &&
      point.y <= 1
  );
};

/**
 * Calculates editorial metadata health without mutating the File. The result is
 * safe to persist and query from the admin media library; it never manufactures
 * descriptive, rights, or generation metadata.
 */
export const assessFileMetadata = (
  file: Partial<TFile>
): {
  metadata_status: "complete" | "incomplete";
  metadata_missing: TFileMetadataIssue[];
} => {
  const missing = new Set<TFileMetadataIssue>();

  if (!file.provider) missing.add("provider");
  if (!file.purpose) missing.add("purpose");
  if (!file.source) missing.add("source");
  if (!hasText(file.checksum) || !SHA256_PATTERN.test(file.checksum)) {
    missing.add("checksum");
  }

  const license = file.attribution?.license;
  if (!license) {
    missing.add("license");
  } else if (CREDIT_REQUIRED_LICENSES.has(license)) {
    if (
      !hasText(file.attribution?.credit_text) ||
      !hasText(file.attribution?.source_url)
    ) {
      missing.add("attribution");
    }
    if (license === "other" && !hasText(file.attribution?.license_url)) {
      missing.add("attribution");
    }
  }

  if (isRasterFile(file)) {
    if (
      !isPositiveDimension(file.metadata?.width) ||
      !isPositiveDimension(file.metadata?.height)
    ) {
      missing.add("dimensions");
    }

    const altText = typeof file.alt_text === "string" ? file.alt_text : null;
    if (
      file.is_decorative === true
        ? altText !== null && altText.length > 0
        : !hasText(altText)
    ) {
      missing.add("alt_text");
    }
    if (!hasValidFocalPoint(file)) missing.add("focal_point");
    if (
      !hasText(file.dominant_color) ||
      !DOMINANT_COLOR_PATTERN.test(file.dominant_color)
    ) {
      missing.add("dominant_color");
    }
    if (
      !hasText(file.blur_data_url) ||
      file.blur_data_url.length > 8192 ||
      !BLUR_DATA_URL_PATTERN.test(file.blur_data_url)
    ) {
      missing.add("blur_placeholder");
    }
  }

  if (file.source === "generated") {
    const provenance = file.provenance;
    if (
      !hasText(provenance?.generator) ||
      !hasText(provenance?.model) ||
      !hasText(provenance?.prompt) ||
      !hasText(provenance?.version)
    ) {
      missing.add("generated_provenance");
    }
  }

  const metadata_missing = Array.from(missing).sort();
  return {
    metadata_status: metadata_missing.length ? "incomplete" : "complete",
    metadata_missing,
  };
};
