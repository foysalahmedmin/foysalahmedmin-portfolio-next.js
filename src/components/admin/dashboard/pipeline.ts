import type { TDashboardSnapshot } from "@/app/api/dashboard/dashboard.service";

export type PipelineStatus = "draft" | "pending" | "published" | "archived";
/** Colour is never the encoding: each status has its own fill pattern and a direct count label. */
export type PipelinePattern = "outline" | "hatch" | "solid" | "dots";

export const STATUS_PATTERN: Readonly<Record<PipelineStatus, PipelinePattern>> =
  {
    draft: "outline",
    pending: "hatch",
    published: "solid",
    archived: "dots",
  };

export const CONTENT_TYPES = [
  {
    key: "case_studies",
    label: "Case studies",
    noun: "case study",
    nouns: "case studies",
    href: "/admin/case-studies",
    statuses: ["draft", "pending", "published", "archived"],
  },
  {
    key: "articles",
    label: "Articles",
    noun: "article",
    nouns: "articles",
    href: "/admin/articles",
    statuses: ["draft", "pending", "published", "archived"],
  },
  {
    key: "projects",
    label: "Projects",
    noun: "project",
    nouns: "projects",
    href: "/admin/projects",
    // Projects have no review step: their publication status is draft, published or archived.
    statuses: ["draft", "published", "archived"],
  },
  {
    key: "videos",
    label: "Videos",
    noun: "video",
    nouns: "videos",
    href: "/admin/videos",
    statuses: ["draft", "pending", "published", "archived"],
  },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  noun: string;
  nouns: string;
  href: string;
  statuses: readonly PipelineStatus[];
}>;

export type PipelineSegment = Readonly<{
  status: PipelineStatus;
  pattern: PipelinePattern;
  count: number;
}>;

export type PipelineRow = Readonly<{
  key: string;
  label: string;
  href: string;
  total: number;
  segments: readonly PipelineSegment[];
}>;

/**
 * One row per content type. Draft, pending and published are always listed (a zero is a real count and
 * keeps the rows aligned); archived appears only when something is archived.
 */
export const buildPipeline = (snapshot: TDashboardSnapshot): PipelineRow[] =>
  CONTENT_TYPES.map((type) => {
    const counts = snapshot.content[type.key].by_status;
    const segments = (type.statuses as readonly PipelineStatus[])
      .map((status) => ({
        status,
        pattern: STATUS_PATTERN[status],
        count: counts[status] ?? 0,
      }))
      .filter((segment) => segment.status !== "archived" || segment.count > 0);
    return {
      key: type.key,
      label: type.label,
      href: type.href,
      total: segments.reduce((sum, segment) => sum + segment.count, 0),
      segments,
    };
  });
