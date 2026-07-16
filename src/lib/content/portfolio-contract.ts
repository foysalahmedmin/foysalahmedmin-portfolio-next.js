import sanitizeHtml from "sanitize-html";
import type { PillarKey } from "./pillars";

export const PROJECT_TYPES = [
  "client",
  "internal",
  "open_source",
  "lab",
] as const;
export type ProjectType = (typeof PROJECT_TYPES)[number];

export const PROJECT_DELIVERY_STATUSES = [
  "planned",
  "active",
  "completed",
] as const;
export type ProjectDeliveryStatus = (typeof PROJECT_DELIVERY_STATUSES)[number];

export const PROJECT_PUBLICATION_STATUSES = [
  "draft",
  "published",
  "archived",
] as const;
export type ProjectPublicationStatus =
  (typeof PROJECT_PUBLICATION_STATUSES)[number];

export const OUTCOME_VERIFICATION_STATES = [
  "derived",
  "verified",
  "unverified",
] as const;
export type OutcomeVerificationState =
  (typeof OUTCOME_VERIFICATION_STATES)[number];

export const LINK_VISIBILITIES = ["public", "private", "hidden"] as const;
export type LinkVisibility = (typeof LINK_VISIBILITIES)[number];

export type ProjectOutcome = Readonly<{
  label: string;
  value: string;
  verification_state: OutcomeVerificationState;
  evidence_reference?: string;
}>;

export type ProjectPublishCandidate = Readonly<{
  primary_pillar?: PillarKey;
  project_type?: ProjectType;
  problem?: string;
  constraints?: readonly string[];
  role?: string;
  architecture?: string;
  decisions?: readonly string[];
  implementation?: string;
  security?: string;
  performance_reliability?: string;
  outcomes?: readonly ProjectOutcome[];
  learnings?: readonly string[];
}>;

export const getProjectPublishReadiness = (
  project: ProjectPublishCandidate
): string[] => {
  const issues: string[] = [];
  if (!project.primary_pillar) issues.push("primary_pillar");
  if (!project.project_type) issues.push("project_type");
  for (const field of [
    "problem",
    "role",
    "architecture",
    "implementation",
    "security",
    "performance_reliability",
  ] as const) {
    if (!project[field]?.trim()) issues.push(field);
  }
  for (const field of ["constraints", "decisions", "learnings"] as const) {
    if (!project[field]?.some((item) => item.trim())) issues.push(field);
  }
  if (
    !project.outcomes?.some(
      (outcome) => outcome.verification_state !== "unverified"
    )
  ) {
    issues.push("outcomes");
  }
  return issues;
};

const isPrivateIpv4 = (hostname: string): boolean => {
  const parts = hostname.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false;
  }
  const [a, b] = parts;
  return (
    a === 10 ||
    a === 127 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    a === 0
  );
};

export const isAllowedPublicProjectUrl = (value: string): boolean => {
  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
    return (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      hostname !== "localhost" &&
      hostname !== "::1" &&
      !hostname.endsWith(".local") &&
      !hostname.endsWith(".internal") &&
      !isPrivateIpv4(hostname)
    );
  } catch {
    return false;
  }
};

export type ArticleBodyMetadata = Readonly<{
  schema_version: 1;
  word_count: number;
  heading_count: number;
}>;

export const deriveArticleBodyMetadata = (
  sanitizedHtml: string
): ArticleBodyMetadata => {
  const textWithBlockBoundaries = sanitizedHtml.replace(
    /<\/?(?:p|h[1-6]|li|blockquote|pre|tr|td|th|br|hr)(?:\s[^>]*)?>/gi,
    " "
  );
  const plainText = sanitizeHtml(textWithBlockBoundaries, {
    allowedTags: [],
    allowedAttributes: {},
  })
    .replace(/\s+/g, " ")
    .trim();
  const words = plainText ? plainText.split(" ").filter(Boolean) : [];
  const headingCount = (sanitizedHtml.match(/<h[2-4](?:\s[^>]*)?>/gi) ?? [])
    .length;
  return {
    schema_version: 1,
    word_count: words.length,
    heading_count: headingCount,
  };
};

export const deriveReadingTimeMinutes = (wordCount: number): number =>
  Math.max(1, Math.ceil(wordCount / 225));

export const getArticlePublishReadiness = (article: {
  excerpt?: string;
  primary_pillar?: PillarKey;
}): string[] => {
  const issues: string[] = [];
  if (!article.excerpt?.trim()) issues.push("excerpt");
  if (!article.primary_pillar) issues.push("primary_pillar");
  return issues;
};
