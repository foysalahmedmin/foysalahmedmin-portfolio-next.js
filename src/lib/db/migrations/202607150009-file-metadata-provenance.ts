import type { Db, Document } from "mongodb";
import type {
  MigrationContext,
  MigrationDefinition,
  MigrationSummary,
} from "./types.ts";

const COLLECTION = "files";
const SHA256_PATTERN = /^[a-f0-9]{64}$/;
const DOMINANT_COLOR_PATTERN = /^#[a-f0-9]{6}$/;
const BLUR_DATA_URL_PATTERN =
  /^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/;
const VALID_PROVIDERS = new Set(["local", "gcs", "cloudinary"]);
const VALID_PURPOSES = new Set([
  "logo",
  "hero",
  "project",
  "article",
  "profile",
  "resume",
  "page",
  "service",
  "skill",
  "timeline",
  "credential",
  "testimonial",
  "social",
  "document",
  "generic",
]);
const VALID_LICENSES = new Set([
  "owned",
  "client-provided",
  "cc0",
  "cc-by-4.0",
  "cc-by-sa-4.0",
  "unsplash",
  "other",
]);
const CREDIT_REQUIRED_LICENSES = new Set([
  "cc-by-4.0",
  "cc-by-sa-4.0",
  "unsplash",
  "other",
]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === "object" && !Array.isArray(value);

const hasText = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const isPositiveDimension = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

const parseExactHostname = (value: unknown): string | null => {
  if (!hasText(value)) return null;
  try {
    const parsed = new URL(value);
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.port ||
      parsed.hash
    ) {
      return null;
    }
    return parsed.hostname;
  } catch {
    return null;
  }
};

/** Returns a provider only when legacy storage evidence is unambiguous. */
export const deriveLegacyFileProvider = (
  file: Document
): "local" | "gcs" | "cloudinary" | null => {
  const metadata = isRecord(file.metadata) ? file.metadata : {};
  const signals = new Set<"local" | "gcs" | "cloudinary">();
  const hostname = parseExactHostname(file.url);

  if (file.provider === "gcp") signals.add("gcs");

  if (
    hasText(metadata.cloud_name) ||
    hasText(metadata.public_id) ||
    hasText(metadata.asset_id) ||
    hostname === "res.cloudinary.com"
  ) {
    signals.add("cloudinary");
  }
  if (hasText(metadata.bucket) || hostname === "storage.googleapis.com") {
    signals.add("gcs");
  }
  if (
    (hasText(metadata.path) && metadata.path.startsWith("/uploads/")) ||
    (typeof file.url === "string" && file.url.startsWith("/uploads/"))
  ) {
    signals.add("local");
  }

  return signals.size === 1 ? Array.from(signals)[0] : null;
};

const deriveLegacySource = (
  file: Document
): "uploaded" | "generated" | null => {
  const metadata = isRecord(file.metadata) ? file.metadata : {};
  if (metadata.source === "uploaded" || metadata.source === "generated") {
    return metadata.source;
  }
  const provenance = isRecord(file.provenance) ? file.provenance : {};
  if (
    hasText(provenance.generator) &&
    hasText(provenance.model) &&
    hasText(provenance.prompt)
  ) {
    return "generated";
  }
  return null;
};

const getMetadataIssues = (file: Document): string[] => {
  const issues = new Set<string>();
  const metadata = isRecord(file.metadata) ? file.metadata : {};
  const attribution = isRecord(file.attribution) ? file.attribution : {};
  const provenance = isRecord(file.provenance) ? file.provenance : {};

  if (!VALID_PROVIDERS.has(String(file.provider))) issues.add("provider");
  if (!VALID_PURPOSES.has(String(file.purpose))) issues.add("purpose");
  if (file.source !== "uploaded" && file.source !== "generated") {
    issues.add("source");
  }
  if (!hasText(file.checksum) || !SHA256_PATTERN.test(file.checksum)) {
    issues.add("checksum");
  }

  if (
    !hasText(attribution.license) ||
    !VALID_LICENSES.has(attribution.license)
  ) {
    issues.add("license");
  } else if (CREDIT_REQUIRED_LICENSES.has(attribution.license)) {
    if (!hasText(attribution.credit_text) || !hasText(attribution.source_url)) {
      issues.add("attribution");
    }
    if (attribution.license === "other" && !hasText(attribution.license_url)) {
      issues.add("attribution");
    }
  }

  const isRaster =
    metadata.file_type === "image" ||
    (typeof file.mimetype === "string" && file.mimetype.startsWith("image/"));
  if (isRaster) {
    if (
      !isPositiveDimension(metadata.width) ||
      !isPositiveDimension(metadata.height)
    ) {
      issues.add("dimensions");
    }
    const altText = typeof file.alt_text === "string" ? file.alt_text : null;
    if (
      file.is_decorative === true
        ? altText !== null && altText.length > 0
        : !hasText(altText)
    ) {
      issues.add("alt_text");
    }
    const focalPoint = isRecord(file.focal_point) ? file.focal_point : {};
    if (
      typeof focalPoint.x !== "number" ||
      !Number.isFinite(focalPoint.x) ||
      focalPoint.x < 0 ||
      focalPoint.x > 1 ||
      typeof focalPoint.y !== "number" ||
      !Number.isFinite(focalPoint.y) ||
      focalPoint.y < 0 ||
      focalPoint.y > 1
    ) {
      issues.add("focal_point");
    }
    if (
      !hasText(file.dominant_color) ||
      !DOMINANT_COLOR_PATTERN.test(file.dominant_color)
    ) {
      issues.add("dominant_color");
    }
    if (
      !hasText(file.blur_data_url) ||
      file.blur_data_url.length > 8192 ||
      !BLUR_DATA_URL_PATTERN.test(file.blur_data_url)
    ) {
      issues.add("blur_placeholder");
    }
  }

  if (file.source === "generated") {
    if (
      !hasText(provenance.generator) ||
      !hasText(provenance.model) ||
      !hasText(provenance.prompt) ||
      !hasText(provenance.version)
    ) {
      issues.add("generated_provenance");
    }
  }

  return Array.from(issues).sort();
};

const arraysEqual = (left: unknown, right: readonly string[]): boolean =>
  Array.isArray(left) &&
  left.length === right.length &&
  left.every((value, index) => value === right[index]);

/**
 * Produces only evidence-backed backfills plus an explicit remediation flag.
 * Descriptive, focal, color, prompt, attribution, and rights data are never
 * inferred by this migration.
 */
export const deriveFileMetadataPatch = (file: Document): Document => {
  const patch: Document = {};
  const metadata = isRecord(file.metadata) ? { ...file.metadata } : {};
  const candidate: Document = { ...file, metadata };

  if (!VALID_PROVIDERS.has(String(file.provider))) {
    const provider = deriveLegacyFileProvider(file);
    if (provider) {
      patch.provider = provider;
      candidate.provider = provider;
    }
  }

  if (!isPositiveDimension(metadata.width) && isPositiveDimension(file.width)) {
    patch["metadata.width"] = file.width;
    metadata.width = file.width;
  }
  if (
    !isPositiveDimension(metadata.height) &&
    isPositiveDimension(file.height)
  ) {
    patch["metadata.height"] = file.height;
    metadata.height = file.height;
  }

  if (file.source !== "uploaded" && file.source !== "generated") {
    const source = deriveLegacySource(file);
    if (source) {
      patch.source = source;
      candidate.source = source;
    }
  }

  const metadataMissing = getMetadataIssues(candidate);
  const metadataStatus = metadataMissing.length ? "incomplete" : "complete";
  if (file.metadata_status !== metadataStatus) {
    patch.metadata_status = metadataStatus;
  }
  if (!arraysEqual(file.metadata_missing, metadataMissing)) {
    patch.metadata_missing = metadataMissing;
  }
  return patch;
};

const collectionExists = async (db: Db): Promise<boolean> =>
  db.listCollections({ name: COLLECTION }, { nameOnly: true }).hasNext();

export const inspectFileMetadataMigration = async (
  context: Pick<MigrationContext, "db">
) => {
  if (!(await collectionExists(context.db))) {
    return {
      collection_exists: false,
      documents: 0,
      records_requiring_patch: 0,
      incomplete_records: 0,
      provider_backfills: 0,
      dimension_backfills: 0,
      source_backfills: 0,
    };
  }

  let documents = 0;
  let recordsRequiringPatch = 0;
  let incompleteRecords = 0;
  let providerBackfills = 0;
  let dimensionBackfills = 0;
  let sourceBackfills = 0;
  const cursor = context.db.collection(COLLECTION).find({});
  for await (const file of cursor) {
    documents += 1;
    const patch = deriveFileMetadataPatch(file);
    if (Object.keys(patch).length) recordsRequiringPatch += 1;
    if ((patch.metadata_status || file.metadata_status) === "incomplete") {
      incompleteRecords += 1;
    }
    if (patch.provider) providerBackfills += 1;
    if (patch["metadata.width"] || patch["metadata.height"]) {
      dimensionBackfills += 1;
    }
    if (patch.source) sourceBackfills += 1;
  }

  return {
    collection_exists: true,
    documents,
    records_requiring_patch: recordsRequiringPatch,
    incomplete_records: incompleteRecords,
    provider_backfills: providerBackfills,
    dimension_backfills: dimensionBackfills,
    source_backfills: sourceBackfills,
  };
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  inspectFileMetadataMigration(context);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspectFileMetadataMigration(context);
  if (!before.collection_exists) return before;

  const collection = context.db.collection(COLLECTION);
  let updated = 0;
  const cursor = collection.find({});
  for await (const file of cursor) {
    await context.assert_lease();
    const patch = deriveFileMetadataPatch(file);
    if (!Object.keys(patch).length) continue;
    const result = await collection.updateOne(
      { _id: file._id },
      { $set: patch }
    );
    updated += result.modifiedCount;
  }

  await context.assert_lease();
  await collection.createIndex(
    { metadata_status: 1, purpose: 1, updated_at: -1 },
    { name: "file_metadata_health" }
  );
  const after = await inspectFileMetadataMigration(context);

  return {
    ...before,
    records_updated: updated,
    metadata_health_index_verified: true,
    remaining_records_requiring_patch: after.records_requiring_patch,
    remaining_incomplete_records: after.incomplete_records,
  };
};

const migration: MigrationDefinition = {
  id: "202607150009-file-metadata-provenance",
  description:
    "Backfill only derivable File provider, dimensions, and source metadata, then flag incomplete editorial provenance for remediation.",
  source_path: "src/lib/db/migrations/202607150009-file-metadata-provenance.ts",
  behavior: {
    transaction: "none",
    creates_indexes: true,
    destructive: false,
    resumable: true,
  },
  dry_run: dryRun,
  up,
};

export default migration;
