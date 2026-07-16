import { z } from "zod";

export const MAX_CONTENT_SLUG_LENGTH = 96;
export const CONTENT_SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const canonicalSlugSchema = z
  .string()
  .min(1)
  .max(MAX_CONTENT_SLUG_LENGTH)
  .regex(CONTENT_SLUG_PATTERN, "Use a canonical lowercase slug");

type NormalizeSlugOptions = Readonly<{
  fallback?: string;
  maxLength?: number;
}>;

const trimSeparator = (value: string): string => value.replace(/^-+|-+$/g, "");

export const normalizeSlug = (
  value: string,
  options: NormalizeSlugOptions = {}
): string => {
  const maxLength = options.maxLength ?? MAX_CONTENT_SLUG_LENGTH;
  const normalized = trimSeparator(
    value
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9]+/g, "-")
  );
  const fallback = trimSeparator(
    (options.fallback ?? "content").toLowerCase().replace(/[^a-z0-9]+/g, "-")
  );
  const candidate = normalized || fallback || "content";
  return trimSeparator(candidate.slice(0, maxLength)) || "content";
};

export const appendSlugSuffix = (
  slug: string,
  suffix: string,
  maxLength = MAX_CONTENT_SLUG_LENGTH
): string => {
  const safeSuffix = normalizeSlug(suffix, { fallback: "id", maxLength: 24 });
  const available = Math.max(1, maxLength - safeSuffix.length - 1);
  return `${trimSeparator(slug.slice(0, available))}-${safeSuffix}`;
};

export const isMongoObjectId = (value: string): boolean =>
  /^[a-f\d]{24}$/i.test(value);

export const normalizeSlugIdentifier = (value: string): string | null => {
  const searchable = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
  return /[a-z0-9]/i.test(searchable)
    ? normalizeSlug(value, { fallback: "content" })
    : null;
};
