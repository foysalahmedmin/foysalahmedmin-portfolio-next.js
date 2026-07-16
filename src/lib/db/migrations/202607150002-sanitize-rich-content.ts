import { sanitizeRichHtml } from "../../content/rich-content.ts";
import type { AnyBulkWriteOperation, Collection, Document } from "mongodb";
import type {
  MigrationContext,
  MigrationDefinition,
  MigrationSummary,
} from "./types.ts";

const COLLECTIONS = ["articles", "projects"] as const;
const SAFE_UNAVAILABLE_CONTENT =
  "<p>This content is temporarily unavailable pending editorial review.</p>";

type RichContentMigrationAnalysis = Readonly<{
  content: string;
  changed: boolean;
  used_fallback: boolean;
}>;

export function analyzeLegacyRichContent(
  value: unknown
): RichContentMigrationAnalysis {
  const original = typeof value === "string" ? value : "";
  const sanitized = sanitizeRichHtml(original).trim();
  const content = sanitized || SAFE_UNAVAILABLE_CONTENT;

  return {
    content,
    changed: content !== original,
    used_fallback: sanitized.length === 0,
  };
}

function hasCurrentRichContent(document: Document, content: string): boolean {
  const richContent = document.rich_content;
  if (!richContent || typeof richContent !== "object") return false;

  const record = richContent as Record<string, unknown>;
  const blocks = Array.isArray(record.blocks) ? record.blocks : [];
  const first = blocks[0];

  return (
    record.schema_version === 1 &&
    record.sanitizer_policy_version === 1 &&
    blocks.length === 1 &&
    typeof first === "object" &&
    first !== null &&
    (first as Record<string, unknown>).type === "rich_text" &&
    (first as Record<string, unknown>).html === content
  );
}

function toStoredRichContent(content: string) {
  return {
    schema_version: 1,
    sanitizer_policy_version: 1,
    blocks: [{ type: "rich_text", html: content }],
  };
}

async function inspectCollection(collection: Collection<Document>) {
  const summary = {
    documents: 0,
    requires_update: 0,
    unsafe_or_noncanonical: 0,
    requires_editorial_review: 0,
  };

  const cursor = collection.find(
    {},
    { projection: { content: 1, rich_content: 1 } }
  );

  for await (const document of cursor) {
    summary.documents += 1;
    const analysis = analyzeLegacyRichContent(document.content);
    const current = hasCurrentRichContent(document, analysis.content);

    if (analysis.changed) summary.unsafe_or_noncanonical += 1;
    if (analysis.used_fallback) summary.requires_editorial_review += 1;
    if (analysis.changed || !current) summary.requires_update += 1;
  }

  return summary;
}

async function migrateCollection(
  collection: Collection<Document>,
  context: MigrationContext
) {
  const summary = {
    documents: 0,
    updated: 0,
    sanitized: 0,
    editorial_review_required: 0,
  };
  let operations: AnyBulkWriteOperation<Document>[] = [];

  const flush = async () => {
    if (!operations.length) return;
    await context.assert_lease();
    const result = await collection.bulkWrite(operations, { ordered: true });
    summary.updated += result.modifiedCount;
    operations = [];
  };

  const cursor = collection.find(
    {},
    { projection: { content: 1, rich_content: 1 }, sort: { _id: 1 } }
  );

  for await (const document of cursor) {
    summary.documents += 1;
    const analysis = analyzeLegacyRichContent(document.content);
    const current = hasCurrentRichContent(document, analysis.content);

    if (analysis.changed) summary.sanitized += 1;
    if (analysis.used_fallback) summary.editorial_review_required += 1;
    if (!analysis.changed && current) continue;

    operations.push({
      updateOne: {
        filter: { _id: document._id },
        update: {
          $set: {
            content: analysis.content,
            rich_content: toStoredRichContent(analysis.content),
          },
        },
      },
    });

    if (operations.length >= 250) await flush();
  }

  await flush();
  return summary;
}

async function dryRun(context: MigrationContext): Promise<MigrationSummary> {
  const collections = Object.fromEntries(
    await Promise.all(
      COLLECTIONS.map(async (name) => [
        name,
        await inspectCollection(context.db.collection(name)),
      ])
    )
  );

  return { collections };
}

async function up(context: MigrationContext): Promise<MigrationSummary> {
  const collections: Record<string, unknown> = {};

  for (const name of COLLECTIONS) {
    collections[name] = await migrateCollection(
      context.db.collection(name),
      context
    );
  }

  return { collections };
}

const migration: MigrationDefinition = {
  id: "202607150002-sanitize-rich-content",
  description:
    "Sanitize legacy project and article HTML into versioned rich-content documents.",
  source_path: "src/lib/db/migrations/202607150002-sanitize-rich-content.ts",
  behavior: {
    transaction: "none",
    creates_indexes: false,
    destructive: true,
    resumable: true,
  },
  dry_run: dryRun,
  up,
};

export default migration;
