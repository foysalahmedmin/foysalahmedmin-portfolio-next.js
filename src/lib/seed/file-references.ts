import type { TFileReferenceModel } from "../../app/api/files/file.type.ts";
import {
  ObjectId,
  type ClientSession,
  type Db,
  type Document,
} from "mongodb";
import { SeedError } from "./errors.ts";
import type {
  ResolvedSeedFileReference,
  SeedTargetCollection,
} from "./types.ts";

const FILE_REFERENCE_MODEL_BY_COLLECTION: Readonly<
  Partial<Record<SeedTargetCollection, TFileReferenceModel>>
> = {
  sites: "Site",
  article_categories: "ArticleCategory",
  project_categories: "ProjectCategory",
  services: "Service",
  skill_groups: "SkillGroup",
  skills: "Skill",
  timeline_entries: "TimelineEntry",
  credentials: "Credential",
  faqs: "FAQ",
  testimonials: "Testimonial",
  legal_documents: "LegalDocument",
  projects: "Project",
  project_resources: "ProjectResource",
  articles: "Article",
  pages: "Page",
};

export const getSeedFileReferenceModel = (
  collection: SeedTargetCollection
): TFileReferenceModel | undefined =>
  FILE_REFERENCE_MODEL_BY_COLLECTION[collection];

export const getSeedOwnedFileReferenceField = (input: {
  manifest_key: string;
  seed_key: string;
  field: string;
}): string => `seed:${input.manifest_key}:${input.seed_key}:${input.field}`;

const referenceTuple = (input: {
  manifest_key: string;
  seed_key: string;
  field: string;
  model: TFileReferenceModel;
  entity: ObjectId;
}) => ({
  model: input.model,
  entity: input.entity,
  field: getSeedOwnedFileReferenceField(input),
});

export const validateSeedFileReferences = async (input: {
  db: Db;
  references: readonly ResolvedSeedFileReference[];
  session: ClientSession;
}): Promise<void> => {
  for (const reference of input.references) {
    if (
      !ObjectId.isValid(reference.file_id) ||
      !getSeedFileReferenceModel(reference.target_collection)
    ) {
      throw new SeedError(
        "SEED_MEDIA_REFERENCE_INVALID",
        "A seed File reference has an unsupported target or identity.",
        [reference.seed_key, reference.field]
      );
    }
    const file = await input.db.collection("files").findOne(
      {
        _id: new ObjectId(reference.file_id),
        lifecycle_state: "ready",
        status: "active",
        is_deleted: { $ne: true },
        purpose: { $in: [...reference.purposes] },
      },
      { projection: { _id: 1 }, session: input.session }
    );
    if (!file) {
      throw new SeedError(
        "SEED_MEDIA_REFERENCE_INVALID",
        "A seed File reference is unavailable or purpose-incompatible.",
        [reference.seed_key, reference.field]
      );
    }
  }
};

export const reconcileSeedRecordFileReferences = async (input: {
  db: Db;
  manifest_key: string;
  target_collection: SeedTargetCollection;
  seed_key: string;
  target_id: ObjectId;
  previous_fields: readonly string[];
  references: readonly ResolvedSeedFileReference[];
  session: ClientSession;
}): Promise<void> => {
  const model = getSeedFileReferenceModel(input.target_collection);
  if (!model) {
    if (!input.previous_fields.length && !input.references.length) return;
    throw new SeedError(
      "SEED_MEDIA_REFERENCE_INVALID",
      "This seed collection cannot own managed File references.",
      [input.seed_key, input.target_collection]
    );
  }

  const desiredByField = new Map(
    input.references.map((reference) => [reference.field, reference])
  );
  const fields = new Set([...input.previous_fields, ...desiredByField.keys()]);
  const files = input.db.collection<Document>("files");

  for (const field of [...fields].sort()) {
    const desired = desiredByField.get(field);
    const tuple = referenceTuple({
      manifest_key: input.manifest_key,
      seed_key: input.seed_key,
      field,
      model,
      entity: input.target_id,
    });
    const desiredId = desired ? new ObjectId(desired.file_id) : undefined;

    await files.updateMany(
      {
        ...(desiredId ? { _id: { $ne: desiredId } } : {}),
        references: { $elemMatch: tuple },
      } as any,
      { $pull: { references: tuple } } as any,
      { session: input.session }
    );

    if (!desired || !desiredId) continue;
    const attachedAt = new Date();
    const attached = await files.updateOne(
      {
        _id: desiredId,
        lifecycle_state: "ready",
        status: "active",
        is_deleted: { $ne: true },
        purpose: { $in: [...desired.purposes] },
        references: { $not: { $elemMatch: tuple } },
      } as any,
      { $push: { references: { ...tuple, attached_at: attachedAt } } } as any,
      { session: input.session }
    );
    if (attached.modifiedCount === 1) continue;

    const alreadyAttached = await files.findOne(
      {
        _id: desiredId,
        lifecycle_state: "ready",
        status: "active",
        is_deleted: { $ne: true },
        purpose: { $in: [...desired.purposes] },
        references: { $elemMatch: tuple },
      },
      { projection: { _id: 1 }, session: input.session }
    );
    if (!alreadyAttached) {
      throw new SeedError(
        "SEED_MEDIA_REFERENCE_INVALID",
        "A managed File changed while its seed reference was attaching.",
        [input.seed_key, field]
      );
    }
  }
};

export const detachSeedRecordFileReferences = async (input: {
  db: Db;
  manifest_key: string;
  target_collection: SeedTargetCollection;
  seed_key: string;
  target_id: ObjectId;
  fields: readonly string[];
  session: ClientSession;
}): Promise<void> =>
  reconcileSeedRecordFileReferences({
    ...input,
    previous_fields: input.fields,
    references: [],
  });
