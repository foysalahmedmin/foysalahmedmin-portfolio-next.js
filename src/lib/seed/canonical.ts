import { createHash } from "node:crypto";
import type { Document } from "mongodb";
import { SeedError } from "./errors.ts";

const MAX_HASH_INPUT_BYTES = 1_048_576;

const normalize = (value: unknown): unknown => {
  if (
    value === null ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return value;
  }
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      throw new SeedError(
        "SEED_MANIFEST_INVALID",
        "Seed values must use finite numbers."
      );
    }
    return Object.is(value, -0) ? 0 : value;
  }
  if (
    typeof value === "bigint" ||
    typeof value === "symbol" ||
    typeof value === "function"
  ) {
    throw new SeedError(
      "SEED_MANIFEST_INVALID",
      "Seed values must be canonical JSON-compatible data."
    );
  }
  if (value === undefined) return undefined;
  if (value instanceof Date) return value.toISOString();
  if (Buffer.isBuffer(value)) {
    throw new SeedError(
      "SEED_MANIFEST_INVALID",
      "Binary media must go through the managed-media seed gateway."
    );
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalize(item) ?? null);
  }
  if (typeof value === "object") {
    const possibleObjectId = value as { toHexString?: () => string };
    if (typeof possibleObjectId.toHexString === "function") {
      return possibleObjectId.toHexString();
    }
    const output: Record<string, unknown> = {};
    for (const key of Object.keys(value as Record<string, unknown>).sort()) {
      if (
        key.includes("\0") ||
        key.startsWith("$") ||
        key === "__proto__" ||
        key === "constructor" ||
        key === "prototype"
      ) {
        throw new SeedError(
          "SEED_MANIFEST_INVALID",
          "Seed values contain an unsafe object key."
        );
      }
      const normalized = normalize((value as Record<string, unknown>)[key]);
      if (normalized !== undefined) output[key] = normalized;
    }
    return output;
  }
  throw new SeedError(
    "SEED_MANIFEST_INVALID",
    "Seed values must be canonical JSON-compatible data."
  );
};

export const canonicalSeedJson = (value: unknown): string => {
  const json = JSON.stringify(normalize(value) ?? null);
  if (Buffer.byteLength(json, "utf8") > MAX_HASH_INPUT_BYTES) {
    throw new SeedError(
      "SEED_MANIFEST_INVALID",
      "A seed payload exceeds the one MiB hashing budget."
    );
  }
  return json;
};

export const hashSeedValue = (value: unknown): string =>
  createHash("sha256").update(canonicalSeedJson(value)).digest("hex");

export const projectControlledFields = (
  document: Readonly<Document>,
  fields: readonly string[]
): Document => {
  const output: Document = {};
  for (const field of [...new Set(fields)].sort()) {
    if (Object.prototype.hasOwnProperty.call(document, field)) {
      output[field] = document[field];
    }
  }
  return output;
};

export const getChangedSeedFields = (
  current: Readonly<Document>,
  desired: Readonly<Document>
): string[] => {
  const keys = [...new Set([...Object.keys(current), ...Object.keys(desired)])];
  return keys
    .filter(
      (key) => hashSeedValue(current[key]) !== hashSeedValue(desired[key])
    )
    .sort();
};
