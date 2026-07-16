import type { Document } from "mongodb";
import { z } from "zod";
import { FILE_PURPOSES } from "../../app/api/files/file.type.ts";
import { canonicalSeedJson, hashSeedValue } from "./canonical.ts";
import { SeedError } from "./errors.ts";
import { getSeedFileReferenceModel } from "./file-references.ts";
import {
  SEED_ALLOWED_TARGET_COLLECTIONS,
  SEED_STAGE_ORDER,
  type SeedFileReference,
  type SeedManifest,
  type SeedMediaPlan,
  type SeedRecordDefinition,
  type ResolvedSeedFileReference,
} from "./types.ts";

const SAFE_KEY = /^[a-z][a-z0-9]*(?:[-_.:][a-z0-9]+)*$/;
const SAFE_FIELD_PATH = /^[a-z][a-z0-9_]*(?:\.(?:[a-z][a-z0-9_]*|\d+))*$/;
const SHA256 = /^[a-f0-9]{64}$/;
const OBJECT_ID = /^[a-f0-9]{24}$/i;
const RASTER_SOURCE = /\.(?:avif|jpe?g|png|webp)$/i;
const FILE_PURPOSE_SET = new Set<string>(FILE_PURPOSES);

const safeHttpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .superRefine((value, context) => {
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      context.addIssue({ code: "custom", message: "Invalid URL." });
      return;
    }
    if (
      parsed.protocol !== "https:" ||
      parsed.username ||
      parsed.password ||
      parsed.hash
    ) {
      context.addIssue({
        code: "custom",
        message:
          "URL must be public HTTPS without credentials or a fragment.",
      });
    }
  });

const seedMediaAttributionSchema = z
  .object({
    creator_name: z.string().trim().min(1).max(200).optional(),
    creator_url: safeHttpsUrlSchema.optional(),
    source_url: safeHttpsUrlSchema.optional(),
    credit_text: z.string().trim().min(1).max(500).optional(),
    license: z.enum([
      "owned",
      "client-provided",
      "cc0",
      "cc-by-4.0",
      "cc-by-sa-4.0",
      "unsplash",
      "other",
    ]),
    license_url: safeHttpsUrlSchema.optional(),
  })
  .strict()
  .superRefine((attribution, context) => {
    if (
      ["cc-by-4.0", "cc-by-sa-4.0", "unsplash", "other"].includes(
        attribution.license
      ) &&
      (!attribution.credit_text || !attribution.source_url)
    ) {
      context.addIssue({
        code: "custom",
        path: ["credit_text"],
        message: "The selected license requires source credit.",
      });
    }
    if (attribution.license === "other" && !attribution.license_url) {
      context.addIssue({
        code: "custom",
        path: ["license_url"],
        message: "A custom license requires its public terms URL.",
      });
    }
  });

const seedMediaProvenanceSchema = z
  .object({
    generator: z.string().trim().min(1).max(160),
    model: z.string().trim().min(1).max(160),
    prompt: z.string().trim().min(1).max(8000),
    version: z.string().trim().min(1).max(120),
    seed: z.string().trim().min(1).max(256).optional(),
    generated_at: z.string().datetime({ offset: true }).optional(),
  })
  .strict();

const seedMediaMetadataSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    source: z.enum(["generated", "uploaded"]),
    alt_text: z.string().trim().max(300).optional(),
    is_decorative: z.boolean().optional(),
    focal_point: z
      .object({ x: z.number().min(0).max(1), y: z.number().min(0).max(1) })
      .strict()
      .optional(),
    dominant_color: z
      .string()
      .trim()
      .regex(/^#[a-f0-9]{6}$/)
      .optional(),
    blur_data_url: z
      .string()
      .max(8192)
      .regex(/^data:image\/(?:webp|png|jpeg);base64,[A-Za-z0-9+/]+={0,2}$/)
      .optional(),
    attribution: seedMediaAttributionSchema.optional(),
    provenance: seedMediaProvenanceSchema.optional(),
  })
  .strict()
  .superRefine((metadata, context) => {
    if (metadata.is_decorative && metadata.alt_text) {
      context.addIssue({
        code: "custom",
        path: ["alt_text"],
        message: "Decorative managed media cannot carry alternative text.",
      });
    }
  });

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
    const parsedMetadata = seedMediaMetadataSchema.safeParse(media.metadata);
    if (!FILE_PURPOSE_SET.has(media.purpose) || !parsedMetadata.success) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "Managed-media seed metadata is invalid.",
        parsedMetadata.success
          ? [media.media_key]
          : parsedMetadata.error.issues.map(
              (issue) => `${media.media_key}.metadata.${issue.path.join(".")}`
            )
      );
    }
    if (
      hashSeedValue(parsedMetadata.data) !== hashSeedValue(media.metadata)
    ) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "Managed-media metadata must already use its canonical trimmed form.",
        [media.media_key]
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
      const metadata = parsedMetadata.data;
      const incomplete = new Set<string>();
      if (!metadata.attribution) incomplete.add("attribution");
      if (metadata.source === "generated" && !metadata.provenance) {
        incomplete.add("provenance");
      }
      if (metadata.source === "uploaded" && metadata.provenance) {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "Uploaded repository media cannot claim generation provenance.",
          [`${media.media_key}.metadata.provenance`]
        );
      }
      if (RASTER_SOURCE.test(media.source.relative_path)) {
        if (metadata.is_decorative === undefined) {
          incomplete.add("is_decorative");
        } else if (!metadata.is_decorative && !metadata.alt_text) {
          incomplete.add("alt_text");
        }
        if (!metadata.focal_point) incomplete.add("focal_point");
        if (!metadata.dominant_color) incomplete.add("dominant_color");
        if (!metadata.blur_data_url) incomplete.add("blur_data_url");
      }
      if (incomplete.size) {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "Repository media requires complete editorial, rights, and provenance metadata.",
          [...incomplete]
            .sort()
            .map((field) => `${media.media_key}.metadata.${field}`)
        );
      }
    } else {
      if (!media.source.requirement.trim()) {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "Pending generated media requires a bounded editorial requirement."
        );
      }
      if (parsedMetadata.data.source !== "generated") {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "Pending generated media must use the generated source classification.",
          [`${media.media_key}.metadata.source`]
        );
      }
      if (parsedMetadata.data.provenance) {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "Pending media cannot claim provenance before an asset exists.",
          [`${media.media_key}.metadata.provenance`]
        );
      }
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
    const referenceFields = new Set<string>();
    if (
      ((record.media_bindings?.length ?? 0) > 0 ||
        (record.file_references?.length ?? 0) > 0) &&
      !getSeedFileReferenceModel(record.collection)
    ) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "This seed collection cannot own managed File references.",
        [identity]
      );
    }
    for (const binding of record.media_bindings ?? []) {
      if (
        !mediaKeys.has(binding.media_key) ||
        !SAFE_FIELD_PATH.test(binding.field_path) ||
        !binding.purposes.length ||
        binding.purposes.some((purpose) => !FILE_PURPOSE_SET.has(purpose)) ||
        referenceFields.has(binding.field_path)
      ) {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "A seed media binding is invalid.",
          [identity, binding.media_key]
        );
      }
      referenceFields.add(binding.field_path);
    }
    for (const reference of record.file_references ?? []) {
      if (
        !OBJECT_ID.test(reference.file_id) ||
        !SAFE_FIELD_PATH.test(reference.field) ||
        !reference.purposes.length ||
        reference.purposes.some((purpose) => !FILE_PURPOSE_SET.has(purpose)) ||
        referenceFields.has(reference.field)
      ) {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "A seed File reference is invalid.",
          [identity, reference.field]
        );
      }
      referenceFields.add(reference.field);
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
  references: ResolvedSeedFileReference[];
} => {
  const mediaByKey = new Map(input.media.map((item) => [item.media_key, item]));
  const references: ResolvedSeedFileReference[] = [];
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
        field: binding.field_path,
        purposes: binding.purposes,
        target_collection: definition.collection,
        seed_key: definition.seed_key,
      });
    }
    references.push(
      ...(definition.file_references ?? []).map((reference) => ({
        ...reference,
        target_collection: definition.collection,
        seed_key: definition.seed_key,
      }))
    );
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
