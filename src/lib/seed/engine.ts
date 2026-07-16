import { randomUUID } from "node:crypto";
import type {
  ClientSession,
  Db,
  Document,
  MongoClient,
  ObjectId,
  WithId,
} from "mongodb";
import { hashSeedValue, projectControlledFields } from "./canonical.ts";
import {
  acquireSeedLease,
  initializeSeedControlPlane,
  releaseSeedLease,
} from "./database.ts";
import { SeedError } from "./errors.ts";
import {
  detachSeedRecordFileReferences,
  reconcileSeedRecordFileReferences,
  validateSeedFileReferences,
} from "./file-references.ts";
import {
  getSeedManifestChecksum,
  resolveSeedMediaBindings,
  validateSeedManifest,
} from "./manifest.ts";
import {
  compensateSeedMedia,
  inspectSeedMedia,
  stageSeedMedia,
} from "./media.ts";
import {
  planSeedRecord,
  seedRecordMetadataId,
  summarizeSeedRecordPlans,
} from "./planner.ts";
import { assertSeedOperationAllowed } from "./policy.ts";
import type {
  SeedEnvironment,
  SeedManifest,
  SeedMediaPlan,
  SeedPlan,
  SeedRecordDefinition,
  SeedRecordMetadata,
  SeedRecordPlan,
  ResolvedSeedFileReference,
  SeedRunOptions,
} from "./types.ts";
import { SEED_STAGE_ORDER } from "./types.ts";

type SeedManifestDocument = {
  _id: string;
  seed_version: number;
  checksum: string;
  mode: string;
  truth: Document;
  record_count: number;
  media_count: number;
  applied_at: Date;
};

type SeedRunDocument = {
  _id: string;
  manifest_key: string;
  seed_version: number;
  checksum?: string;
  operation: "apply" | "reset";
  environment: SeedEnvironment;
  force: boolean;
  counts: Document;
  completed_at: Date;
};

const cloneTopLevel = (document: Readonly<Document>): Document => ({
  ...document,
});

const isTransactionUnsupported = (error: unknown): boolean => {
  const candidate = error as {
    code?: number;
    codeName?: string;
    message?: string;
  };
  return (
    candidate.code === 20 ||
    candidate.codeName === "IllegalOperation" ||
    /transaction numbers are only allowed|replica set|mongos/i.test(
      candidate.message ?? ""
    )
  );
};

const validateNextTarget = (
  definition: SeedRecordDefinition,
  target: Document,
  now: Date,
  mode: "create" | "update"
): Document => {
  const next = cloneTopLevel(target);
  const priorFields = Object.keys(definition.payload);
  for (const field of priorFields) next[field] = definition.payload[field];
  if (mode === "create") {
    Object.assign(next, definition.insert_only ?? {}, {
      created_at: now,
      updated_at: now,
    });
  } else {
    Object.assign(next, definition.update_only ?? {}, { updated_at: now });
  }
  definition.validate(next);
  return next;
};

const loadSeedRecordPlan = async (input: {
  db: Db;
  definition: SeedRecordDefinition;
  manifest_key: string;
  force: boolean;
  session?: ClientSession;
}): Promise<SeedRecordPlan> => {
  const metadataId = seedRecordMetadataId(
    input.manifest_key,
    input.definition.collection,
    input.definition.seed_key
  );
  const metadata = (await input.db
    .collection<SeedRecordMetadata>("seed_records")
    .findOne(
      { _id: metadataId },
      { session: input.session }
    )) as SeedRecordMetadata | null;
  const targets = await input.db
    .collection(input.definition.collection)
    .find(input.definition.lookup, { session: input.session })
    .limit(2)
    .toArray();
  if (targets.length > 1) {
    throw new SeedError(
      "SEED_CONFLICT",
      "A stable seed lookup matched more than one target.",
      [input.definition.seed_key]
    );
  }
  let target: WithId<Document> | undefined = targets[0];
  if (!target && metadata?.target_id !== undefined) {
    target =
      (await input.db
        .collection(input.definition.collection)
        .findOne({ _id: metadata.target_id }, { session: input.session })) ??
      undefined;
  }
  return planSeedRecord({
    definition: input.definition,
    target,
    metadata: metadata ?? undefined,
    force: input.force,
  });
};

const loadPlan = async (input: {
  db: Db;
  manifest: SeedManifest;
  records: readonly SeedRecordDefinition[];
  media: readonly SeedMediaPlan[];
  force: boolean;
  checksum: string;
  session?: ClientSession;
}): Promise<SeedPlan> => {
  const records: SeedRecordPlan[] = [];
  for (const definition of input.records) {
    records.push(
      await loadSeedRecordPlan({
        db: input.db,
        definition,
        manifest_key: input.manifest.manifest_key,
        force: input.force,
        session: input.session,
      })
    );
  }
  return {
    manifest_key: input.manifest.manifest_key,
    seed_version: input.manifest.seed_version,
    checksum: input.checksum,
    media: input.media,
    records,
    counts: summarizeSeedRecordPlans(records),
  };
};

const assertStoredManifestCompatible = async (input: {
  db: Db;
  manifest: SeedManifest;
  checksum: string;
  session?: ClientSession;
}): Promise<void> => {
  const stored = await input.db
    .collection<SeedManifestDocument>("seed_manifests")
    .findOne({ _id: input.manifest.manifest_key }, { session: input.session });
  if (!stored) return;
  if (Number(stored.seed_version) > input.manifest.seed_version) {
    throw new SeedError(
      "SEED_VERSION_DOWNGRADE",
      "A stored seed manifest cannot be downgraded."
    );
  }
  if (
    Number(stored.seed_version) === input.manifest.seed_version &&
    stored.checksum !== input.checksum
  ) {
    throw new SeedError(
      "SEED_CHECKSUM_DRIFT",
      "Seed content changed without a seed-version increment."
    );
  }
};

const metadataForPlan = (
  manifest: SeedManifest,
  plan: SeedRecordPlan,
  targetId: ObjectId,
  now: Date,
  fileReferenceFields: readonly string[]
): SeedRecordMetadata => ({
  _id: seedRecordMetadataId(
    manifest.manifest_key,
    plan.definition.collection,
    plan.definition.seed_key
  ),
  manifest_key: manifest.manifest_key,
  target_collection: plan.definition.collection,
  target_id: targetId,
  seed_key: plan.definition.seed_key,
  seed_version: plan.definition.seed_version,
  last_seed_hash: plan.desired_hash,
  controlled_fields: Object.keys(plan.definition.payload).sort(),
  file_reference_fields: [...new Set(fileReferenceFields)].sort(),
  truth: plan.definition.truth,
  applied_at: now,
});

const applyRecordPlan = async (input: {
  db: Db;
  manifest: SeedManifest;
  plan: SeedRecordPlan;
  now: Date;
  session: ClientSession;
  references: readonly ResolvedSeedFileReference[];
}): Promise<void> => {
  const { plan } = input;
  if (plan.action === "conflict") {
    throw new SeedError(
      "SEED_CONFLICT",
      "Seed application stopped because a managed or unmanaged record must be reviewed.",
      [plan.definition.seed_key, plan.reason, ...plan.changed_fields]
    );
  }

  let targetId = plan.target?._id;
  if (plan.action === "create") {
    const next = validateNextTarget(
      plan.definition,
      plan.definition.payload as Document,
      input.now,
      "create"
    );
    const inserted = await input.db
      .collection(plan.definition.collection)
      .insertOne(next, { session: input.session });
    targetId = inserted.insertedId;
  } else if (plan.action === "update") {
    if (!plan.target?._id) {
      throw new SeedError(
        "SEED_CONFLICT",
        "A seed update lost its target identity.",
        [plan.definition.seed_key]
      );
    }
    const next = validateNextTarget(
      plan.definition,
      plan.target,
      input.now,
      "update"
    );
    const priorFields = plan.metadata?.controlled_fields ?? [];
    const removedFields = priorFields.filter(
      (field) =>
        !Object.prototype.hasOwnProperty.call(plan.definition.payload, field)
    );
    const result = await input.db
      .collection(plan.definition.collection)
      .updateOne(
        { _id: plan.target._id },
        {
          $set: Object.fromEntries(
            Object.keys(plan.definition.payload)
              .map((field) => [field, next[field]])
              .concat(
                Object.entries({
                  ...(plan.definition.update_only ?? {}),
                  updated_at: input.now,
                })
              )
          ),
          ...(removedFields.length
            ? {
                $unset: Object.fromEntries(
                  removedFields.map((field) => [field, ""])
                ),
              }
            : {}),
        },
        { session: input.session }
      );
    if (result.matchedCount !== 1) {
      throw new SeedError(
        "SEED_CONFLICT",
        "A seed target changed while the transaction was applying.",
        [plan.definition.seed_key]
      );
    }
  }

  if (targetId === undefined) {
    throw new SeedError(
      "SEED_CONFLICT",
      "A seed record has no target identity.",
      [plan.definition.seed_key]
    );
  }
  if ((plan.action === "adopt" || plan.action === "unchanged") && plan.target) {
    plan.definition.validate(plan.target);
  }
  await reconcileSeedRecordFileReferences({
    db: input.db,
    manifest_key: input.manifest.manifest_key,
    target_collection: plan.definition.collection,
    seed_key: plan.definition.seed_key,
    target_id: targetId,
    previous_fields: plan.metadata?.file_reference_fields ?? [],
    references: input.references,
    session: input.session,
  });
  const metadata = metadataForPlan(
    input.manifest,
    plan,
    targetId,
    input.now,
    input.references.map((reference) => reference.field)
  );
  if (
    plan.action !== "unchanged" ||
    !plan.metadata ||
    plan.metadata.seed_version !== metadata.seed_version ||
    hashSeedValue(plan.metadata.truth) !== hashSeedValue(metadata.truth) ||
    hashSeedValue(plan.metadata.file_reference_fields ?? []) !==
      hashSeedValue(metadata.file_reference_fields ?? [])
  ) {
    const { _id, ...metadataBody } = metadata;
    await input.db
      .collection<SeedRecordMetadata>("seed_records")
      .replaceOne({ _id }, metadataBody, {
        upsert: true,
        session: input.session,
      });
  }
};

const applyTransaction = async (input: {
  options: SeedRunOptions;
  manifest: SeedManifest;
  records: readonly SeedRecordDefinition[];
  media: readonly SeedMediaPlan[];
  references: ReturnType<typeof resolveSeedMediaBindings>["references"];
  checksum: string;
  session: ClientSession;
}): Promise<SeedPlan> => {
  await assertStoredManifestCompatible({
    db: input.options.db,
    manifest: input.manifest,
    checksum: input.checksum,
    session: input.session,
  });
  const plan = await loadPlan({
    db: input.options.db,
    manifest: input.manifest,
    records: input.records,
    media: input.media,
    force: input.options.force,
    checksum: input.checksum,
    session: input.session,
  });
  if (plan.counts.conflict) {
    const conflicts = plan.records
      .filter((record) => record.action === "conflict")
      .flatMap((record) => [record.definition.seed_key, record.reason]);
    throw new SeedError(
      "SEED_CONFLICT",
      "Seed application stopped; existing records were preserved.",
      conflicts
    );
  }

  if (input.references.length) {
    await validateSeedFileReferences({
      db: input.options.db,
      references: input.references,
      session: input.session,
    });
  }

  const now = input.options.now?.() ?? new Date();
  for (const record of plan.records) {
    const recordReferences = input.references.filter(
      (reference) =>
        reference.target_collection === record.definition.collection &&
        reference.seed_key === record.definition.seed_key
    );
    await applyRecordPlan({
      db: input.options.db,
      manifest: input.manifest,
      plan: record,
      now,
      session: input.session,
      references: recordReferences,
    });
  }
  await input.options.db
    .collection<SeedManifestDocument>("seed_manifests")
    .replaceOne(
      { _id: input.manifest.manifest_key },
      {
        seed_version: input.manifest.seed_version,
        checksum: input.checksum,
        mode: input.manifest.mode,
        truth: input.manifest.truth,
        record_count: input.records.length,
        media_count: input.manifest.media.length,
        applied_at: now,
      },
      { upsert: true, session: input.session }
    );
  await input.options.db.collection<SeedRunDocument>("seed_runs").insertOne(
    {
      _id: randomUUID(),
      manifest_key: input.manifest.manifest_key,
      seed_version: input.manifest.seed_version,
      checksum: input.checksum,
      operation: "apply",
      environment: input.options.environment,
      force: input.options.force,
      counts: plan.counts,
      completed_at: now,
    },
    { session: input.session }
  );
  return plan;
};

export const planSeedManifest = async (
  options: SeedRunOptions
): Promise<SeedPlan> => {
  const manifest = validateSeedManifest(options.manifest);
  assertSeedOperationAllowed({
    environment: options.environment,
    mode: manifest.mode,
    operation: "dry_run",
    force: options.force,
    production_confirmation: options.production_confirmation,
  });
  const checksum = getSeedManifestChecksum(manifest);
  await assertStoredManifestCompatible({
    db: options.db,
    manifest,
    checksum,
  });
  const media = await inspectSeedMedia(manifest.media, options.media_gateway);
  const resolved = resolveSeedMediaBindings({
    records: manifest.records,
    media,
  });
  return loadPlan({
    db: options.db,
    manifest,
    records: resolved.records,
    media,
    force: options.force,
    checksum,
  });
};

export const runSeedManifest = async (
  options: SeedRunOptions
): Promise<SeedPlan> => {
  const manifest = validateSeedManifest(options.manifest);
  if (options.dry_run) return planSeedManifest({ ...options, manifest });
  assertSeedOperationAllowed({
    environment: options.environment,
    mode: manifest.mode,
    operation: "apply",
    force: options.force,
    production_confirmation: options.production_confirmation,
  });

  await initializeSeedControlPlane(options.db);
  const token = randomUUID();
  const leaseNow = options.now?.() ?? new Date();
  await acquireSeedLease(options.db, { token, now: leaseNow });
  let staged: SeedMediaPlan[] = [];
  try {
    staged = await stageSeedMedia(manifest.media, options.media_gateway);
    const resolved = resolveSeedMediaBindings({
      records: manifest.records,
      media: staged,
    });
    const checksum = getSeedManifestChecksum(manifest);
    const session = options.client.startSession();
    try {
      let result: SeedPlan | undefined;
      await session.withTransaction(
        async () => {
          result = await applyTransaction({
            options,
            manifest,
            records: resolved.records,
            media: staged,
            references: resolved.references,
            checksum,
            session,
          });
        },
        {
          readConcern: { level: "snapshot" },
          writeConcern: { w: "majority" },
        }
      );
      if (!result) {
        throw new SeedError(
          "SEED_TRANSACTION_REQUIRED",
          "The seed transaction did not commit."
        );
      }
      return result;
    } catch (error) {
      if (options.media_gateway) {
        await compensateSeedMedia(staged, options.media_gateway);
      }
      if (isTransactionUnsupported(error)) {
        throw new SeedError(
          "SEED_TRANSACTION_REQUIRED",
          "Seed writes require MongoDB transaction support; no fallback write was attempted."
        );
      }
      throw error;
    } finally {
      await session.endSession();
    }
  } finally {
    await releaseSeedLease(options.db, token);
  }
};

export const resetSeedManifest = async (input: {
  client: MongoClient;
  db: Db;
  manifest: SeedManifest;
  environment: SeedEnvironment;
  force: boolean;
  reset_confirmation?: string;
  now?: () => Date;
}): Promise<{ deleted: number; missing: number }> => {
  const manifest = validateSeedManifest(input.manifest);
  assertSeedOperationAllowed({
    environment: input.environment,
    mode: manifest.mode,
    operation: "reset",
    force: input.force,
    reset_confirmation: input.reset_confirmation,
  });
  await initializeSeedControlPlane(input.db);
  const token = randomUUID();
  await acquireSeedLease(input.db, {
    token,
    now: input.now?.() ?? new Date(),
  });
  const session = input.client.startSession();
  try {
    const summary = { deleted: 0, missing: 0 };
    await session.withTransaction(async () => {
      const metadata = await input.db
        .collection<SeedRecordMetadata>("seed_records")
        .find({ manifest_key: manifest.manifest_key }, { session })
        .toArray();
      const definitions = new Map(
        manifest.records.map((record) => [
          seedRecordMetadataId(
            manifest.manifest_key,
            record.collection,
            record.seed_key
          ),
          record,
        ])
      );
      const ordered = [...metadata].sort((left, right) => {
        const leftStage = definitions.get(left._id)?.stage ?? "admin";
        const rightStage = definitions.get(right._id)?.stage ?? "admin";
        return (
          SEED_STAGE_ORDER.indexOf(rightStage) -
          SEED_STAGE_ORDER.indexOf(leftStage)
        );
      });
      for (const record of ordered) {
        await detachSeedRecordFileReferences({
          db: input.db,
          manifest_key: record.manifest_key,
          target_collection: record.target_collection,
          seed_key: record.seed_key,
          target_id: record.target_id,
          fields: record.file_reference_fields ?? [],
          session,
        });
        const target = await input.db
          .collection(record.target_collection)
          .findOne({ _id: record.target_id }, { session });
        if (!target) {
          summary.missing += 1;
          await input.db
            .collection<SeedRecordMetadata>("seed_records")
            .deleteOne({ _id: record._id }, { session });
          continue;
        }
        const currentHash = hashSeedValue(
          projectControlledFields(target, record.controlled_fields)
        );
        if (!input.force && currentHash !== record.last_seed_hash) {
          throw new SeedError(
            "SEED_RESET_CONFLICT",
            "Reset preserved an edited seeded record; use --force only in a safe non-production environment.",
            [record.seed_key]
          );
        }
        const deleted = await input.db
          .collection(record.target_collection)
          .deleteOne({ _id: record.target_id }, { session });
        if (deleted.deletedCount !== 1) {
          throw new SeedError(
            "SEED_RESET_CONFLICT",
            "A seed target changed while reset was applying.",
            [record.seed_key]
          );
        }
        await input.db
          .collection<SeedRecordMetadata>("seed_records")
          .deleteOne({ _id: record._id }, { session });
        summary.deleted += 1;
      }
      await input.db
        .collection<SeedManifestDocument>("seed_manifests")
        .deleteOne({ _id: manifest.manifest_key }, { session });
      await input.db.collection<SeedRunDocument>("seed_runs").insertOne(
        {
          _id: randomUUID(),
          manifest_key: manifest.manifest_key,
          seed_version: manifest.seed_version,
          operation: "reset",
          environment: input.environment,
          force: input.force,
          counts: summary,
          completed_at: input.now?.() ?? new Date(),
        },
        { session }
      );
    });
    return summary;
  } catch (error) {
    if (isTransactionUnsupported(error)) {
      throw new SeedError(
        "SEED_TRANSACTION_REQUIRED",
        "Seed reset requires MongoDB transaction support; no fallback delete was attempted."
      );
    }
    throw error;
  } finally {
    await session.endSession();
    await releaseSeedLease(input.db, token);
  }
};
