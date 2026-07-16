import AppError from "@/builder/app-error";
import { appendSlugSuffix, normalizeSlug } from "@/lib/content/slug";
import httpStatus from "http-status";
import mongoose, { type ClientSession } from "mongoose";
import ContentSlugAliasModel, {
  type ContentSlugScope,
} from "./content-slug-alias.model";

const toTargetString = (value: unknown): string =>
  (value as { toString(): string }).toString();

const SCOPE_COLLECTIONS: Record<ContentSlugScope, string> = {
  project: "projects",
  article: "articles",
  project_category: "projectcategories",
  article_category: "articlecategories",
};

export const findSlugTarget = async (
  scope: ContentSlugScope,
  slug: string
): Promise<string | null> => {
  const alias = await ContentSlugAliasModel.findOne({ scope, slug })
    .select("target")
    .lean();
  if (alias) return toTargetString(alias.target);

  // This fallback keeps the expand release collision-safe before the alias
  // backfill migration has run on every environment.
  const record = await mongoose.connection
    .collection(SCOPE_COLLECTIONS[scope])
    .findOne(
      { $or: [{ slug }, { "slug_history.slug": slug }] },
      { projection: { _id: 1 } }
    );
  return record ? toTargetString(record._id) : null;
};

export const allocateContentSlug = async ({
  scope,
  requested,
  fallback,
  target,
}: Readonly<{
  scope: ContentSlugScope;
  requested: string;
  fallback: string;
  target: string;
}>): Promise<string> => {
  const base = normalizeSlug(requested, { fallback });
  const currentTarget = await findSlugTarget(scope, base);
  if (!currentTarget || currentTarget === target) return base;

  const stableSuffix = target.slice(-8).toLowerCase();
  const suffixed = appendSlugSuffix(base, stableSuffix);
  const suffixedTarget = await findSlugTarget(scope, suffixed);
  if (!suffixedTarget || suffixedTarget === target) return suffixed;

  for (let counter = 2; counter <= 99; counter += 1) {
    const candidate = appendSlugSuffix(base, `${stableSuffix}-${counter}`);
    const candidateTarget = await findSlugTarget(scope, candidate);
    if (!candidateTarget || candidateTarget === target) return candidate;
  }

  throw new AppError(
    httpStatus.CONFLICT,
    "A collision-safe slug could not be allocated"
  );
};

export const reserveContentSlug = async ({
  scope,
  slug,
  target,
  session,
}: Readonly<{
  scope: ContentSlugScope;
  slug: string;
  target: string;
  session?: ClientSession;
}>): Promise<void> => {
  const existing = await ContentSlugAliasModel.findOne({ scope, slug })
    .session(session ?? null)
    .lean();
  if (existing) {
    if (toTargetString(existing.target) !== target) {
      throw new AppError(httpStatus.CONFLICT, "Slug is already reserved");
    }
    return;
  }

  try {
    await ContentSlugAliasModel.create(
      [{ scope, slug, target }],
      session ? { session } : undefined
    );
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === 11000
    ) {
      throw new AppError(httpStatus.CONFLICT, "Slug is already reserved");
    }
    throw error;
  }
};
