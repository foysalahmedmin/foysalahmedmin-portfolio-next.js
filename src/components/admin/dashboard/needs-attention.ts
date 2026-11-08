import type { TDashboardSnapshot } from "@/app/api/dashboard/dashboard.service";
import type { Capability } from "@/lib/auth/capabilities";
import { plural } from "./format";
import { CONTENT_TYPES } from "./pipeline";

export type AttentionSeverity = "high" | "medium";

export type AttentionItem = Readonly<{
  id: string;
  severity: AttentionSeverity;
  /** The measured number. */
  count: number;
  /** What was measured, without the number: "notification emails in dead letter". */
  fact: string;
  /** "Open inbox". */
  action: string;
  /** The workspace, with the filter already applied only when that workspace reads it from the URL. */
  href: string;
  /** True when `href` carries a filter. */
  filtered: boolean;
  /** False when the viewer cannot open the workspace: the fact still shows, the link does not. */
  linkable: boolean;
}>;

/**
 * The URL parameters each workspace really honours. A link only carries a filter listed here, so the
 * dashboard never promises a filtered view the workspace would silently ignore.
 *
 * The inbox page reads `status` and `delivery_status`, the media page reads `metadata_status`. The content
 * workspaces keep their filters in component state, so their links open the bare workspace until they read
 * the URL too (Phase 8).
 */
export const HONOURED_FILTERS: Readonly<Record<string, readonly string[]>> = {
  "/admin/contacts": ["status", "delivery_status"],
  "/admin/media": ["metadata_status"],
};

type Filter = Readonly<{ param: string; value: string }>;

const WORKSPACES = {
  inbox: {
    path: "/admin/contacts",
    name: "inbox",
    capability: "inbox:manage",
  },
  media: {
    path: "/admin/media",
    name: "media library",
    capability: "media:manage",
  },
} as const satisfies Record<
  string,
  { path: string; name: string; capability: Capability }
>;

type Draft = {
  id: string;
  severity: AttentionSeverity;
  count: number;
  fact: string;
  path: string;
  name: string;
  capability: Capability;
  filter?: Filter;
};

const SEVERITY_ORDER: Record<AttentionSeverity, number> = {
  high: 0,
  medium: 1,
};

/**
 * What counts as an attention item, and why it ranks where it does.
 * High: visitors or delivery are affected now (failed email, unanswered inquiry, broken media, a public
 * link that goes nowhere). Medium: editorial debt that blocks or weakens publishing.
 */
const collect = (snapshot: TDashboardSnapshot): Draft[] => {
  const { content, inbox, media, system } = snapshot;
  const drafts: Draft[] = [
    {
      id: "outbox-dead-letter",
      severity: "high",
      count: system.outbox.by_status.dead_letter,
      fact: "notification emails in dead letter",
      ...WORKSPACES.inbox,
      filter: { param: "delivery_status", value: "dead_letter" },
    },
    {
      id: "inquiries-new",
      severity: "high",
      count: inbox.by_status.new,
      fact: "new inquiries",
      ...WORKSPACES.inbox,
      filter: { param: "status", value: "new" },
    },
    {
      id: "media-errors",
      severity: "high",
      count: media.operational_errors,
      fact: "media files with lifecycle errors",
      ...WORKSPACES.media,
    },
  ];

  const contentRules: Array<{
    id: string;
    severity: AttentionSeverity;
    measure: (type: (typeof CONTENT_TYPES)[number]) => number;
    fact: (type: (typeof CONTENT_TYPES)[number], count: number) => string;
  }> = [
    {
      id: "broken-links",
      severity: "high",
      measure: (type) => content.health.by_type[type.key].broken_links,
      fact: (type, n) =>
        `${plural(n, type.noun, type.nouns)} with a public link but no URL`,
    },
    {
      id: "incomplete",
      severity: "medium",
      measure: (type) => content.health.by_type[type.key].incomplete,
      fact: (type, n) => `incomplete ${plural(n, type.noun, type.nouns)}`,
    },
    {
      id: "stale-drafts",
      severity: "medium",
      measure: (type) => content.health.by_type[type.key].stale_drafts,
      fact: (type, n) =>
        `${type.noun} ${plural(n, "draft")} untouched for 30 days`,
    },
    {
      id: "missing-thumbnail",
      severity: "medium",
      measure: (type) => content.health.by_type[type.key].missing_media,
      fact: (type, n) =>
        `published ${plural(n, type.noun, type.nouns)} without a thumbnail`,
    },
  ];
  for (const rule of contentRules) {
    for (const type of CONTENT_TYPES) {
      drafts.push({
        id: `${rule.id}-${type.key}`,
        severity: rule.severity,
        count: rule.measure(type),
        fact: rule.fact(type, rule.measure(type)),
        path: type.href,
        name: type.label.toLowerCase(),
        capability: "content:read",
      });
    }
  }

  drafts.push({
    id: "media-metadata",
    severity: "medium",
    count: media.metadata.incomplete,
    fact: "media files missing metadata",
    ...WORKSPACES.media,
    filter: { param: "metadata_status", value: "incomplete" },
  });
  return drafts;
};

const withFilter = (
  path: string,
  filter: Filter | undefined,
  honoured: Readonly<Record<string, readonly string[]>>
): { href: string; filtered: boolean } =>
  filter && honoured[path]?.includes(filter.param)
    ? {
        href: `${path}?${filter.param}=${encodeURIComponent(filter.value)}`,
        filtered: true,
      }
    : { href: path, filtered: false };

/**
 * Prioritised measured problems: high before medium, larger counts first. Only non-zero measurements are
 * listed; an empty array is the "Nothing needs attention" state.
 */
export const deriveNeedsAttention = (
  snapshot: TDashboardSnapshot,
  capabilities: readonly string[],
  honoured: Readonly<Record<string, readonly string[]>> = HONOURED_FILTERS
): AttentionItem[] =>
  collect(snapshot)
    .filter((draft) => draft.count > 0)
    .sort(
      (a, b) =>
        SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity] ||
        b.count - a.count
    )
    .map((draft) => ({
      id: draft.id,
      severity: draft.severity,
      count: draft.count,
      fact: draft.fact,
      action: `Open ${draft.name}`,
      ...withFilter(draft.path, draft.filter, honoured),
      linkable: capabilities.includes(draft.capability),
    }));
