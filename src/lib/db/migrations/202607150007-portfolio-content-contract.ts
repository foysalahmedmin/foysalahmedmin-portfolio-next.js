import sanitizeHtml from "sanitize-html";
import type {
  MigrationContext,
  MigrationDefinition,
  MigrationSummary,
} from "./types.ts";

export const deriveLegacyDeliveryStatus = (
  status: unknown
): "planned" | "active" | "completed" | null => {
  if (status === "planned") return "planned";
  if (status === "in_progress" || status === "on_hold") return "active";
  if (status === "completed") return "completed";
  return null;
};

export const deriveArticleContractMetadata = (html: string) => {
  const textWithBlockBoundaries = html.replace(
    /<\/?(?:p|h[1-6]|li|blockquote|pre|tr|td|th|br|hr)(?:\s[^>]*)?>/gi,
    " "
  );
  const plainText = sanitizeHtml(textWithBlockBoundaries, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();
  const wordCount = plainText ? plainText.split(" ").filter(Boolean).length : 0;
  return {
    body_metadata: {
      schema_version: 1,
      word_count: wordCount,
      heading_count: (html.match(/<h[2-4](?:\s[^>]*)?>/gi) ?? []).length,
    },
    reading_time_minutes: Math.max(1, Math.ceil(wordCount / 225)),
  } as const;
};

export const inspectPortfolioContentContract = async (
  context: Pick<MigrationContext, "db">
) => {
  const [
    projectsMissingPublication,
    projectsMissingDelivery,
    articlesMissingMetadata,
  ] = await Promise.all([
    context.db.collection("projects").countDocuments({
      publication_status: { $exists: false },
    }),
    context.db.collection("projects").countDocuments({
      delivery_status: { $exists: false },
      status: { $in: ["planned", "in_progress", "on_hold", "completed"] },
    }),
    context.db.collection("articles").countDocuments({
      $or: [
        { body_metadata: { $exists: false } },
        { reading_time_minutes: { $exists: false } },
        { reading_time_source: { $exists: false } },
      ],
    }),
  ]);
  return {
    projects_missing_publication: projectsMissingPublication,
    projects_missing_mappable_delivery: projectsMissingDelivery,
    articles_missing_derived_metadata: articlesMissingMetadata,
  };
};

const dryRun = async (context: MigrationContext): Promise<MigrationSummary> =>
  inspectPortfolioContentContract(context);

const up = async (context: MigrationContext): Promise<MigrationSummary> => {
  const before = await inspectPortfolioContentContract(context);
  await context.assert_lease();

  const projectResult = await context.db.collection("projects").updateMany({}, [
    {
      $set: {
        publication_status: {
          $ifNull: [
            "$publication_status",
            {
              $cond: [{ $eq: ["$status", "completed"] }, "published", "draft"],
            },
          ],
        },
        delivery_status: {
          $ifNull: [
            "$delivery_status",
            {
              $switch: {
                branches: [
                  {
                    case: { $eq: ["$status", "planned"] },
                    then: "planned",
                  },
                  {
                    case: {
                      $in: ["$status", ["in_progress", "on_hold"]],
                    },
                    then: "active",
                  },
                  {
                    case: { $eq: ["$status", "completed"] },
                    then: "completed",
                  },
                ],
                default: "$$REMOVE",
              },
            },
          ],
        },
        secondary_pillars: { $ifNull: ["$secondary_pillars", []] },
        constraints: { $ifNull: ["$constraints", []] },
        decisions: { $ifNull: ["$decisions", []] },
        outcomes: { $ifNull: ["$outcomes", []] },
        learnings: { $ifNull: ["$learnings", []] },
      },
    },
  ]);

  let articlesUpdated = 0;
  const cursor = context.db.collection("articles").find(
    {
      $or: [
        { body_metadata: { $exists: false } },
        { reading_time_minutes: { $exists: false } },
        { reading_time_source: { $exists: false } },
        { secondary_pillars: { $exists: false } },
        { topics: { $exists: false } },
      ],
    },
    {
      projection: {
        _id: 1,
        content: 1,
        reading_time_minutes: 1,
        reading_time_source: 1,
        secondary_pillars: 1,
        topics: 1,
      },
    }
  );
  for await (const article of cursor) {
    await context.assert_lease();
    const metadata = deriveArticleContractMetadata(
      typeof article.content === "string" ? article.content : ""
    );
    const manualReadingTime =
      article.reading_time_source === "manual" &&
      typeof article.reading_time_minutes === "number";
    const result = await context.db.collection("articles").updateOne(
      { _id: article._id },
      {
        $set: {
          body_metadata: metadata.body_metadata,
          reading_time_source: manualReadingTime ? "manual" : "derived",
          reading_time_minutes: manualReadingTime
            ? article.reading_time_minutes
            : metadata.reading_time_minutes,
          secondary_pillars: Array.isArray(article.secondary_pillars)
            ? article.secondary_pillars
            : [],
          topics: Array.isArray(article.topics) ? article.topics : [],
        },
      }
    );
    articlesUpdated += result.modifiedCount;
  }

  const after = await inspectPortfolioContentContract(context);
  return {
    projects_updated: projectResult.modifiedCount,
    articles_updated: articlesUpdated,
    ...before,
    remaining_projects_missing_publication: after.projects_missing_publication,
    remaining_projects_missing_mappable_delivery:
      after.projects_missing_mappable_delivery,
    remaining_articles_missing_metadata:
      after.articles_missing_derived_metadata,
  };
};

const migration: MigrationDefinition = {
  id: "202607150007-portfolio-content-contract",
  description:
    "Backfill non-claim portfolio lifecycle and derived article metadata fields without inventing editorial content.",
  source_path:
    "src/lib/db/migrations/202607150007-portfolio-content-contract.ts",
  behavior: {
    transaction: "none",
    creates_indexes: false,
    destructive: false,
    resumable: true,
  },
  dry_run: dryRun,
  up,
};

export default migration;
