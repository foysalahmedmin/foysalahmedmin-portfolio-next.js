/**
 * A readable diff between the Site draft and its published snapshot (Phase 7, "Review and publish").
 * Pure and generic: it walks whatever sections the snapshots hold, so a new Site section is diffed
 * without a change here (it only lacks a friendly group name until it is added to SECTION_LABELS).
 */

export type SiteChangeKind = "added" | "removed" | "changed";

export type SiteChange = Readonly<{
  /** Snapshot section key, for example `contact`. */
  section: string;
  /** Stable location of the field, for example `navigation.header[projects].label`. */
  path: string;
  /** Human label of the field inside its section, for example `Header › Projects › Label`. */
  label: string;
  kind: SiteChangeKind;
  /** Plain text, already truncated. `null` when that side has no value. */
  was: string | null;
  now: string | null;
}>;

export type SiteChangeGroup = Readonly<{
  section: string;
  label: string;
  changes: readonly SiteChange[];
}>;

/** The order sections are listed in. Anything not named here follows, in snapshot order. */
export const SECTION_LABELS: Readonly<Record<string, string>> = {
  identity: "Identity",
  positioning: "Positioning",
  pillars: "Pillars",
  brand: "Brand media",
  contact: "Contact",
  navigation: "Navigation",
  social_links: "Social links",
  primary_ctas: "Primary calls to action",
  footer: "Footer",
  seo: "SEO and metadata",
  experience: "Experience defaults",
  fallbacks: "Fallback media",
  process: "Process",
  metrics: "Metrics",
  engagement_models: "Engagement models",
  commitments: "Commitments",
  workflow_example: "Workflow example",
  deliverable_samples: "Deliverable samples",
  next_steps: "Next steps",
  fit: "Fit check",
  principles: "Principles",
  finder: "Starting-point finder",
};

/** Keys the published snapshot adds on top of the draft shape; they are not content. */
const SNAPSHOT_META = new Set(["revision", "published_at", "published_by"]);

export const MAX_VALUE_LENGTH = 160;

type Walk = { section: string; out: SiteChange[] };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** An unset value is `undefined`, `null` or an empty string: clearing a field and never setting it are the same. */
const isUnset = (value: unknown): boolean =>
  value === undefined || value === null || value === "";

const equal = (a: unknown, b: unknown): boolean => {
  if (isUnset(a) || isUnset(b)) return isUnset(a) && isUnset(b);
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, i) => equal(item, b[i]));
  }
  if (isRecord(a) && isRecord(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    return [...keys].every((key) => equal(a[key], b[key]));
  }
  return a === b;
};

/** Cuts on code points (never inside a surrogate pair) and collapses whitespace so one value stays one line. */
export const truncate = (text: string, max = MAX_VALUE_LENGTH): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  const points = Array.from(flat);
  return points.length > max ? `${points.slice(0, max - 1).join("")}…` : flat;
};

const show = (value: unknown): string | null => {
  if (isUnset(value)) return null;
  if (typeof value === "string") return truncate(value);
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value) && value.every((v) => typeof v === "string")) {
    return truncate(value.join(", "));
  }
  return truncate(JSON.stringify(value) ?? "");
};

/** `pillars[backend].headline`: list items are bracketed, record keys are dotted. */
const joinPath = (segments: string[]): string =>
  segments.reduce(
    (acc, segment) =>
      segment.startsWith("[") || !acc ? acc + segment : `${acc}.${segment}`,
    ""
  );

const humanize = (segment: string): string => {
  const words = segment.replace(/[_-]+/g, " ").trim();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : segment;
};

const idOf = (item: unknown, index: number): string => {
  if (isRecord(item)) {
    const id = item.key ?? item.engagement_key;
    if (typeof id === "string" && id) return id;
  }
  return `#${index + 1}`;
};

const nameOf = (item: unknown, fallback: string): string => {
  if (isRecord(item)) {
    for (const field of ["label", "title", "name", "question", "key"]) {
      const value = item[field];
      if (typeof value === "string" && value.trim()) return truncate(value, 60);
    }
  }
  return fallback;
};

const push = (
  walk: Walk,
  path: string[],
  labels: string[],
  was: unknown,
  now: unknown
) => {
  const kind: SiteChangeKind = isUnset(was)
    ? "added"
    : isUnset(now)
      ? "removed"
      : "changed";
  walk.out.push({
    section: walk.section,
    path: joinPath(path),
    label: labels.join(" › ") || humanize(walk.section),
    kind,
    was: show(was),
    now: show(now),
  });
};

const diffKeyed = (
  was: unknown[],
  now: unknown[],
  path: string[],
  labels: string[],
  walk: Walk
) => {
  const wasById = new Map(was.map((item, i) => [idOf(item, i), item]));
  const nowById = new Map(now.map((item, i) => [idOf(item, i), item]));
  for (const [id, item] of wasById) {
    if (!nowById.has(id)) {
      const name = nameOf(item, id);
      walk.out.push({
        section: walk.section,
        path: joinPath([...path, `[${id}]`]),
        label: [...labels, name].join(" › "),
        kind: "removed",
        was: name,
        now: null,
      });
    }
  }
  for (const [id, item] of nowById) {
    const before = wasById.get(id);
    if (!wasById.has(id)) {
      const name = nameOf(item, id);
      walk.out.push({
        section: walk.section,
        path: joinPath([...path, `[${id}]`]),
        label: [...labels, name].join(" › "),
        kind: "added",
        was: null,
        now: name,
      });
    } else {
      visit(
        before,
        item,
        [...path, `[${id}]`],
        [...labels, nameOf(item, nameOf(before, id))],
        walk
      );
    }
  }
  const shared = (ids: string[], other: Map<string, unknown>) =>
    ids.filter((id) => other.has(id));
  const wasOrder = shared([...wasById.keys()], nowById);
  const nowOrder = shared([...nowById.keys()], wasById);
  if (wasOrder.join("\u0000") !== nowOrder.join("\u0000")) {
    walk.out.push({
      section: walk.section,
      path: joinPath([...path, "order"]),
      label: [...labels, "Order"].join(" › "),
      kind: "changed",
      was: truncate(wasOrder.join(", ")),
      now: truncate(nowOrder.join(", ")),
    });
  }
};

const diffPrimitives = (
  was: unknown[],
  now: unknown[],
  path: string[],
  labels: string[],
  walk: Walk
) => {
  const wasSet = new Set(was.map(String));
  const nowSet = new Set(now.map(String));
  const removed = [...wasSet].filter((v) => !nowSet.has(v));
  const added = [...nowSet].filter((v) => !wasSet.has(v));
  for (const value of removed) push(walk, path, labels, value, undefined);
  for (const value of added) push(walk, path, labels, undefined, value);
  const keptWas = [...wasSet].filter((v) => nowSet.has(v));
  const keptNow = [...nowSet].filter((v) => wasSet.has(v));
  if (keptWas.join("\u0000") !== keptNow.join("\u0000")) {
    walk.out.push({
      section: walk.section,
      path: joinPath([...path, "order"]),
      label: [...labels, "Order"].join(" › "),
      kind: "changed",
      was: truncate(keptWas.join(", ")),
      now: truncate(keptNow.join(", ")),
    });
  }
};

const visit = (
  was: unknown,
  now: unknown,
  path: string[],
  labels: string[],
  walk: Walk
) => {
  if (equal(was, now)) return;
  // A whole record or list that appears or disappears is listed field by field against an empty side.
  const wasValue = isUnset(was) && (isRecord(now) || Array.isArray(now));
  const nowValue = isUnset(now) && (isRecord(was) || Array.isArray(was));
  const left = wasValue ? (Array.isArray(now) ? [] : {}) : was;
  const right = nowValue ? (Array.isArray(was) ? [] : {}) : now;

  if (isRecord(left) && isRecord(right)) {
    for (const key of new Set([...Object.keys(left), ...Object.keys(right)])) {
      visit(
        left[key],
        right[key],
        [...path, key],
        [...labels, humanize(key)],
        walk
      );
    }
  } else if (Array.isArray(left) && Array.isArray(right)) {
    const hasObjects = [...left, ...right].some(isRecord);
    (hasObjects ? diffKeyed : diffPrimitives)(left, right, path, labels, walk);
  } else {
    push(walk, path, labels, left, right);
  }
};

/**
 * Changes between a published snapshot and the current draft, in section order. With no published
 * snapshot nothing is listed as changed: there is nothing to compare against.
 */
export const diffSiteSnapshots = (
  published: Readonly<Record<string, unknown>> | null | undefined,
  draft: Readonly<Record<string, unknown>>
): SiteChange[] => {
  if (!published) return [];
  const keys = [
    ...new Set([...Object.keys(published), ...Object.keys(draft)]),
  ].filter((key) => !SNAPSHOT_META.has(key));
  const known = Object.keys(SECTION_LABELS);
  const ordered = [
    ...known.filter((key) => keys.includes(key)),
    ...keys.filter((key) => !known.includes(key)),
  ];
  const out: SiteChange[] = [];
  for (const section of ordered) {
    const walk: Walk = { section, out };
    visit(published[section], draft[section], [section], [], walk);
  }
  return out;
};

export const groupChanges = (
  changes: readonly SiteChange[]
): SiteChangeGroup[] => {
  const groups = new Map<string, SiteChange[]>();
  for (const change of changes) {
    groups.set(change.section, [...(groups.get(change.section) ?? []), change]);
  }
  return [...groups].map(([section, list]) => ({
    section,
    label: SECTION_LABELS[section] ?? humanize(section),
    changes: list,
  }));
};
