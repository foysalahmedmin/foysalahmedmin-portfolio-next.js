export const ARTICLE_PUBLIC_CACHE_TAG = "portfolio:v1:articles" as const;
export const PROJECT_PUBLIC_CACHE_TAG = "portfolio:v1:projects" as const;
export const CASE_STUDY_PUBLIC_CACHE_TAG = "portfolio:v1:case-studies" as const;
export const VIDEO_PUBLIC_CACHE_TAG = "portfolio:v1:videos" as const;
export const PUBLISHED_PAGE_RESOLVER_CACHE_TAG =
  "portfolio:v1:published-page-resolver" as const;

export const LEGACY_PUBLIC_CONTENT_DOMAINS = [
  "article",
  "project",
  "case_study",
  "video",
] as const;
export type TLegacyPublicContentDomain =
  (typeof LEGACY_PUBLIC_CONTENT_DOMAINS)[number];

export const LEGACY_PUBLIC_CONTENT_CACHE_TAGS: Readonly<
  Record<TLegacyPublicContentDomain, string>
> = {
  article: ARTICLE_PUBLIC_CACHE_TAG,
  project: PROJECT_PUBLIC_CACHE_TAG,
  case_study: CASE_STUDY_PUBLIC_CACHE_TAG,
  video: VIDEO_PUBLIC_CACHE_TAG,
};
