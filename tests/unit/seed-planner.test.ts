import { hashSeedValue } from "@/lib/seed/canonical";
import { planSeedRecord } from "@/lib/seed/planner";
import type {
  SeedRecordDefinition,
  SeedRecordMetadata,
} from "@/lib/seed/types";
import { ObjectId, type Document, type WithId } from "mongodb";
import { describe, expect, it } from "vitest";

const targetId = new ObjectId();
const definition = (payload: Document): SeedRecordDefinition => ({
  stage: "site",
  collection: "sites",
  seed_key: "test.record",
  seed_version: 2,
  lookup: { stable_key: "primary" },
  payload,
  truth: {
    content_tier: "foundation",
    truth_status: "verified_by_code",
    publication_policy: "draft_only",
    synthetic: false,
  },
  validate: () => undefined,
});

const metadata = (
  payload: Document,
  overrides: Partial<SeedRecordMetadata> = {}
): SeedRecordMetadata => ({
  _id: "foundation:sites:test.record",
  manifest_key: "foundation",
  target_collection: "sites",
  target_id: targetId,
  seed_key: "test.record",
  seed_version: 1,
  last_seed_hash: hashSeedValue(payload),
  controlled_fields: Object.keys(payload),
  truth: {
    content_tier: "foundation",
    truth_status: "verified_by_code",
    publication_policy: "draft_only",
    synthetic: false,
  },
  applied_at: new Date("2026-07-15T00:00:00.000Z"),
  ...overrides,
});

const target = (payload: Document): WithId<Document> => ({
  _id: targetId,
  ...payload,
});

describe("stable-key seed planning", () => {
  it("creates in an empty target collection", () => {
    const payload = { stable_key: "primary", value: "one" };
    expect(
      planSeedRecord({ definition: definition(payload), force: false })
    ).toMatchObject({ action: "create", reason: "target_missing" });
  });

  it("is unchanged on rerun and creates no duplicate", () => {
    const payload = { stable_key: "primary", value: "one" };
    expect(
      planSeedRecord({
        definition: definition(payload),
        target: target(payload),
        metadata: metadata(payload, { seed_version: 2 }),
        force: false,
      })
    ).toMatchObject({ action: "unchanged", reason: "already_current" });
  });

  it("adopts an identical target left by a partial prior run", () => {
    const payload = { stable_key: "primary", value: "one" };
    expect(
      planSeedRecord({
        definition: definition(payload),
        target: target(payload),
        force: false,
      })
    ).toMatchObject({
      action: "adopt",
      reason: "matching_unmanaged_target",
    });
  });

  it("updates a seed-owned target only when its prior hash still matches", () => {
    const previous = { stable_key: "primary", value: "one" };
    const desired = { stable_key: "primary", value: "two" };
    expect(
      planSeedRecord({
        definition: definition(desired),
        target: target(previous),
        metadata: metadata(previous),
        force: false,
      })
    ).toMatchObject({ action: "update", reason: "seed_changed" });
  });

  it("requires a per-record version increment when controlled content changes", () => {
    const previous = { stable_key: "primary", value: "one" };
    const desired = { stable_key: "primary", value: "two" };
    expect(
      planSeedRecord({
        definition: { ...definition(desired), seed_version: 1 },
        target: target(previous),
        metadata: metadata(previous),
        force: true,
      })
    ).toMatchObject({
      action: "conflict",
      reason: "seed_checksum_drift",
    });
  });

  it("preserves an edited target unless non-production force is deliberate", () => {
    const previous = { stable_key: "primary", value: "one" };
    const edited = { stable_key: "primary", value: "owner edit" };
    const desired = { stable_key: "primary", value: "two" };
    expect(
      planSeedRecord({
        definition: definition(desired),
        target: target(edited),
        metadata: metadata(previous),
        force: false,
      })
    ).toMatchObject({ action: "conflict", reason: "edited_target" });
    expect(
      planSeedRecord({
        definition: definition(desired),
        target: target(edited),
        metadata: metadata(previous),
        force: true,
      })
    ).toMatchObject({ action: "update", reason: "edited_target" });
  });

  it("does not silently resurrect a missing managed record", () => {
    const payload = { stable_key: "primary", value: "one" };
    expect(
      planSeedRecord({
        definition: definition(payload),
        metadata: metadata(payload),
        force: false,
      })
    ).toMatchObject({
      action: "conflict",
      reason: "managed_target_missing",
    });
  });
});
