import type { Document, WithId } from "mongodb";
import {
  getChangedSeedFields,
  hashSeedValue,
  projectControlledFields,
} from "./canonical.ts";
import type {
  SeedRecordDefinition,
  SeedRecordMetadata,
  SeedRecordPlan,
} from "./types.ts";

const sameTargetId = (left: unknown, right: unknown): boolean =>
  left !== undefined && right !== undefined && String(left) === String(right);

export const seedRecordMetadataId = (
  manifestKey: string,
  collection: string,
  seedKey: string
): string => `${manifestKey}:${collection}:${seedKey}`;

export const planSeedRecord = (input: {
  definition: SeedRecordDefinition;
  target?: WithId<Document>;
  metadata?: SeedRecordMetadata;
  force: boolean;
}): SeedRecordPlan => {
  const { definition, target, metadata } = input;
  const desired = definition.payload as Document;
  const desiredHash = hashSeedValue(desired);
  const desiredFields = Object.keys(desired).sort();
  const controlledFields = metadata?.controlled_fields ?? desiredFields;
  const currentProjection = target
    ? projectControlledFields(target, controlledFields)
    : undefined;
  const currentHash = currentProjection
    ? hashSeedValue(currentProjection)
    : undefined;
  const changedFields = target
    ? getChangedSeedFields(
        projectControlledFields(target, [
          ...new Set([...controlledFields, ...desiredFields]),
        ]),
        desired
      )
    : desiredFields;

  if (metadata && metadata.seed_version > definition.seed_version) {
    return {
      definition,
      action: "conflict",
      reason: "seed_version_downgrade",
      desired_hash: desiredHash,
      current_hash: currentHash,
      changed_fields: changedFields,
      target,
      metadata,
    };
  }

  if (metadata && target && !sameTargetId(metadata.target_id, target._id)) {
    return {
      definition,
      action: "conflict",
      reason: "target_identity_mismatch",
      desired_hash: desiredHash,
      current_hash: currentHash,
      changed_fields: changedFields,
      target,
      metadata,
    };
  }

  if (
    metadata &&
    metadata.seed_version === definition.seed_version &&
    metadata.last_seed_hash !== desiredHash
  ) {
    return {
      definition,
      action: "conflict",
      reason: "seed_checksum_drift",
      desired_hash: desiredHash,
      current_hash: currentHash,
      changed_fields: changedFields,
      target,
      metadata,
    };
  }

  if (!target) {
    if (!metadata || input.force) {
      return {
        definition,
        action: "create",
        reason: "target_missing",
        desired_hash: desiredHash,
        changed_fields: changedFields,
        metadata,
      };
    }
    return {
      definition,
      action: "conflict",
      reason: "managed_target_missing",
      desired_hash: desiredHash,
      changed_fields: changedFields,
      metadata,
    };
  }

  if (!metadata) {
    if (currentHash === desiredHash) {
      return {
        definition,
        action: "adopt",
        reason: "matching_unmanaged_target",
        desired_hash: desiredHash,
        current_hash: currentHash,
        changed_fields: [],
        target,
      };
    }
    return {
      definition,
      action: input.force ? "update" : "conflict",
      reason: "unmanaged_target",
      desired_hash: desiredHash,
      current_hash: currentHash,
      changed_fields: changedFields,
      target,
    };
  }

  if (currentHash !== metadata.last_seed_hash) {
    if (
      hashSeedValue(projectControlledFields(target, desiredFields)) ===
      desiredHash
    ) {
      return {
        definition,
        action: "adopt",
        reason: "matching_unmanaged_target",
        desired_hash: desiredHash,
        current_hash: currentHash,
        changed_fields: [],
        target,
        metadata,
      };
    }
    return {
      definition,
      action: input.force ? "update" : "conflict",
      reason: "edited_target",
      desired_hash: desiredHash,
      current_hash: currentHash,
      changed_fields: changedFields,
      target,
      metadata,
    };
  }

  if (desiredHash === metadata.last_seed_hash) {
    return {
      definition,
      action: "unchanged",
      reason: "already_current",
      desired_hash: desiredHash,
      current_hash: currentHash,
      changed_fields: [],
      target,
      metadata,
    };
  }

  return {
    definition,
    action: "update",
    reason: "seed_changed",
    desired_hash: desiredHash,
    current_hash: currentHash,
    changed_fields: changedFields,
    target,
    metadata,
  };
};

export const summarizeSeedRecordPlans = (
  records: readonly SeedRecordPlan[]
): Record<SeedRecordPlan["action"], number> => ({
  create: records.filter((record) => record.action === "create").length,
  update: records.filter((record) => record.action === "update").length,
  adopt: records.filter((record) => record.action === "adopt").length,
  unchanged: records.filter((record) => record.action === "unchanged").length,
  conflict: records.filter((record) => record.action === "conflict").length,
});
