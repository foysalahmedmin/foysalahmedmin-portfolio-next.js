import type { Document } from "mongodb";
import { z } from "zod";
import { canonicalSeedJson, hashSeedValue } from "./canonical.ts";
import { SeedError } from "./errors.ts";
import {
  SEED_ALLOWED_TARGET_COLLECTIONS,
  SEED_STAGE_ORDER,
  type SeedFileReference,
  type SeedManifest,
  type SeedMediaPlan,
  type SeedRecordDefinition,
} from "./types.ts";

const SAFE_KEY = /^[a-z][a-z0-9]*(?:[-_.:][a-z0-9]+)*$/;
const SAFE_FIELD_PATH = /^[a-z][a-z0-9_]*(?:\.(?:[a-z][a-z0-9_]*|\d+))*$/;
const SHA256 = /^[a-f0-9]{64}$/;

const truthSchema = z
  .object({
    content_tier: z.enum(["foundation", "demo"]),
    truth_status: z.enum([
      "verified_by_code",
      "pending_owner_verification",
      "derived",
    ]),
    publication_policy: z.enum([
      "draft_only",
      "non_production_only",
      "eligible_after_review",
    ]),
    synthetic: z.boolean(),
  })
  .strict();

const validateSafeLookup = (lookup: Readonly<Document>): void => {
  const entries = Object.entries(lookup);
  if (!entries.length || entries.length > 4) {
    throw new SeedError(
      "SEED_MANIFEST_INVALID",
      "Every seed record requires one to four stable lookup fields."
    );
  }
  for (const [key, value] of entries) {
    if (!/^[a-z][a-z0-9_]*$/.test(key) || key.startsWith("$")) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "Seed lookup fields must be simple, allowlisted identifiers."
      );
    }
    const type = typeof value;
    const objectIdLike =
      value &&
      type === "object" &&
      typeof (value as { toHexString?: unknown }).toHexString === "function";
    if (
      value === null ||
      (!objectIdLike && !["string", "number", "boolean"].includes(type))
    ) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "Seed lookup values must be scalar stable identities."
      );
    }
  }
};

const hasUnsafePublishState = (value: unknown): boolean => {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasUnsafePublishState);
  const record = value as Record<string, unknown>;
  if (record.status === "published") return true;
  if (
    "published" in record &&
    record.published !== null &&
    record.published !== undefined
  ) {
    return true;
  }
  return Object.values(record).some(hasUnsafePublishState);
};

export const validateSeedManifest = (manifest: SeedManifest): SeedManifest => {
  if (
    !SAFE_KEY.test(manifest.manifest_key) ||
    manifest.manifest_key.length > 80
  ) {
    throw new SeedError(
      "SEED_MANIFEST_INVALID",
      "The seed manifest key is invalid."
    );
  }
  if (
    !Number.isSafeInteger(manifest.seed_version) ||
    manifest.seed_version < 1 ||
    manifest.seed_version > 1_000_000
  ) {
    throw new SeedError(
      "SEED_MANIFEST_INVALID",
      "The seed manifest version is invalid."
    );
  }
  if (!manifest.description.trim() || manifest.description.length > 500) {
    throw new SeedError(
      "SEED_MANIFEST_INVALID",
      "The seed manifest description is invalid."
    );
  }

  const manifestTruth = truthSchema.safeParse(manifest.truth);
  if (!manifestTruth.success) {
    throw new SeedError(
      "SEED_MANIFEST_INVALID",
      "The seed manifest truth marker is invalid."
    );
  }
  if (
    (manifest.mode === "demo") !== manifest.truth.synthetic ||
    manifest.truth.content_tier !== manifest.mode ||
    (manifest.mode === "demo" &&
      manifest.truth.publication_policy !== "non_production_only")
  ) {
    throw new SeedError(
      "SEED_MANIFEST_INVALID",
      "Seed mode and truth markers do not agree."
    );
  }

  const mediaKeys = new Set<string>();
  for (const media of manifest.media) {
    if (!SAFE_KEY.test(media.media_key) || mediaKeys.has(media.media_key)) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "Managed-media seed keys must be unique and stable."
      );
    }
    mediaKeys.add(media.media_key);
    if (!SAFE_KEY.test(media.purpose) || !media.metadata.name.trim()) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "Managed-media seed metadata is invalid."
      );
    }
    if (
      media.metadata.is_decorative &&
      Boolean(media.metadata.alt_text?.trim())
    ) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "Decorative managed media cannot carry alternative text."
      );
    }
    if (media.source.kind === "repository_file") {
      if (
        media.source.relative_path.startsWith("/") ||
        media.source.relative_path.split(/[\\/]/).includes("..") ||
        !/^[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(media.source.relative_path) ||
        !SHA256.test(media.source.source_sha256)
      ) {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "Repository media requires a safe relative path and SHA-256 checksum."
        );
      }
    } else if (!media.source.requirement.trim()) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "Pending generated media requires a bounded editorial requirement."
      );
    }
  }

  const identities = new Set<string>();
  let previousStage = -1;
  for (const record of manifest.records) {
    const stageIndex = SEED_STAGE_ORDER.indexOf(record.stage);
    const identity = `${record.collection}:${record.seed_key}`;
    if (
      stageIndex < previousStage ||
      !SEED_ALLOWED_TARGET_COLLECTIONS.includes(record.collection) ||
      !SAFE_KEY.test(record.seed_key) ||
      record.seed_key.length > 120 ||
      identities.has(identity) ||
      !Number.isSafeInteger(record.seed_version) ||
      record.seed_version < 1 ||
      record.seed_version > manifest.seed_version
    ) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "Seed records must be unique, versioned, allowlisted, and dependency ordered.",
        [identity]
      );
    }
    previousStage = stageIndex;
    identities.add(identity);
    validateSafeLookup(record.lookup);
    canonicalSeedJson(record.payload);
    canonicalSeedJson(record.insert_only ?? {});
    canonicalSeedJson(record.update_only ?? {});

    for (const [field, value] of Object.entries(record.lookup)) {
      if (
        !Object.prototype.hasOwnProperty.call(record.payload, field) ||
        hashSeedValue(record.payload[field]) !== hashSeedValue(value)
      ) {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "Stable lookup fields must be present unchanged in the controlled payload.",
          [identity, field]
        );
      }
    }
    if (!truthSchema.safeParse(record.truth).success) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "A seed record truth marker is invalid.",
        [identity]
      );
    }
    if (
      record.truth.content_tier !== manifest.mode ||
      (manifest.mode === "demo" && !record.truth.synthetic)
    ) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "A seed record truth marker conflicts with the manifest mode.",
        [identity]
      );
    }
    if (
      record.truth.publication_policy !== "eligible_after_review" &&
      hasUnsafePublishState(record.payload)
    ) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "Draft-only and demo seed records cannot carry published state.",
        [identity]
      );
    }
    for (const binding of record.media_bindings ?? []) {
      if (
        !mediaKeys.has(binding.media_key) ||
        !SAFE_FIELD_PATH.test(binding.field_path) ||
        !binding.purposes.length
      ) {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "A seed media binding is invalid.",
          [identity, binding.media_key]
        );
      }
    }
  }
  return manifest;
};

const cloneSeedValue = (value: unknown): unknown => {
  if (value instanceof Date || value === null || typeof value !== "object") {
    return value;
  }
  if (typeof (value as { toHexString?: unknown }).toHexString === "function") {
    return value;
  }
  if (Array.isArray(value)) return value.map(cloneSeedValue);
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, item]) => [
      key,
      cloneSeedValue(item),
    ])
  );
};

const setBoundValue = (
  target: Document,
  path: string,
  value: unknown
): void => {
  const segments = path.split(".");
  let cursor: unknown = target;
  for (const [index, segment] of segments.entries()) {
    const final = index === segments.length - 1;
    if (Array.isArray(cursor)) {
      const itemIndex = Number(segment);
      if (
        !Number.isSafeInteger(itemIndex) ||
        itemIndex < 0 ||
        itemIndex >= cursor.length
      ) {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "A managed-media binding points outside its target array.",
          [path]
        );
      }
      if (final) cursor[itemIndex] = value;
      else cursor = cursor[itemIndex];
      continue;
    }
    if (!cursor || typeof cursor !== "object") {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "A managed-media binding has no compatible target field.",
        [path]
      );
    }
    const record = cursor as Record<string, unknown>;
    if (final) record[segment] = value;
    else cursor = record[segment];
  }
};

export const resolveSeedMediaBindings = (input: {
  records: readonly SeedRecordDefinition[];
  media: readonly SeedMediaPlan[];
}): {
  records: SeedRecordDefinition[];
  references: SeedFileReference[];
} => {
  const mediaByKey = new Map(input.media.map((item) => [item.media_key, item]));
  const references: SeedFileReference[] = [];
  const records = input.records.map((definition) => {
    const payload = cloneSeedValue(definition.payload) as Document;
    for (const binding of definition.media_bindings ?? []) {
      const media = mediaByKey.get(binding.media_key);
      if (!media?.file_id) {
        if (binding.required) {
          throw new SeedError(
            "SEED_MEDIA_REFERENCE_INVALID",
            "A required managed-media binding has no ready File.",
            [definition.seed_key, binding.media_key]
          );
        }
        continue;
      }
      setBoundValue(payload, binding.field_path, media.file_id);
      references.push({
        file_id: media.file_id,
        field: `${definition.seed_key}.${binding.field_path}`,
        purposes: binding.purposes,
      });
    }
    references.push(...(definition.file_references ?? []));
    return { ...definition, payload };
  });
  return { records, references };
};

export const getSeedManifestChecksum = (manifest: SeedManifest): string =>
  hashSeedValue({
    manifest_key: manifest.manifest_key,
    seed_version: manifest.seed_version,
    mode: manifest.mode,
    description: manifest.description,
    truth: manifest.truth,
    media: manifest.media,
    records: manifest.records.map((record) => ({
      stage: record.stage,
      collection: record.collection,
      seed_key: record.seed_key,
      seed_version: record.seed_version,
      lookup: record.lookup,
      payload: record.payload,
      truth: record.truth,
      media_bindings: record.media_bindings ?? [],
      file_references: record.file_references ?? [],
    })),
  });
