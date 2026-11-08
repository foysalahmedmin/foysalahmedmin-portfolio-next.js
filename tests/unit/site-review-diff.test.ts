import { describe, expect, it } from "vitest";
import { createNeutralSiteDraft } from "@/app/api/site/site.policy";
import {
  diffSiteSnapshots,
  groupChanges,
  MAX_VALUE_LENGTH,
  truncate,
} from "@/components/admin/site-review/diff";

type Snapshot = Record<string, unknown>;

const published = (): Snapshot => ({
  ...structuredClone(createNeutralSiteDraft()),
  revision: 12,
  published_at: "2026-11-01T00:00:00.000Z",
  published_by: "507f1f77bcf86cd799439011",
});

const draft = (): Snapshot => structuredClone(createNeutralSiteDraft());

const link = (key: string, label: string, enabled = true) => ({
  key,
  label,
  kind: "internal",
  href: `/${key}`,
  enabled,
});

describe("diffSiteSnapshots", () => {
  it("lists nothing when there is no published snapshot to compare with", () => {
    const next = draft();
    (next.identity as Snapshot).public_name = "Someone";
    expect(diffSiteSnapshots(null, next)).toEqual([]);
    expect(diffSiteSnapshots(undefined, next)).toEqual([]);
  });

  it("lists nothing for identical content and ignores the snapshot revision fields", () => {
    expect(diffSiteSnapshots(published(), draft())).toEqual([]);
  });

  it("reports a changed field with its section, label, was and now", () => {
    const before = published();
    (before.identity as Snapshot).public_name = "Old Name";
    const next = draft();
    (next.identity as Snapshot).public_name = "New Name";
    expect(diffSiteSnapshots(before, next)).toEqual([
      {
        section: "identity",
        path: "identity.public_name",
        label: "Public name",
        kind: "changed",
        was: "Old Name",
        now: "New Name",
      },
    ]);
  });

  it("reports added and removed fields, treating an empty string as unset", () => {
    const before = published();
    (before.positioning as Snapshot).headline = "Gone";
    (before.positioning as Snapshot).compact = "";
    const next = draft();
    (next.positioning as Snapshot).short_bio = "Fresh";
    (next.positioning as Snapshot).compact = undefined;
    const changes = diffSiteSnapshots(before, next);
    expect(changes).toEqual([
      expect.objectContaining({
        label: "Headline",
        kind: "removed",
        was: "Gone",
        now: null,
      }),
      expect.objectContaining({
        label: "Short bio",
        kind: "added",
        was: null,
        now: "Fresh",
      }),
    ]);
  });

  it("keeps false and zero as real values", () => {
    const before = published();
    const next = draft();
    ((next.seo as Snapshot).allow_indexing as boolean) = true;
    ((before.experience as Snapshot).feature_flags as Snapshot).show_metrics =
      false;
    ((next.experience as Snapshot).feature_flags as Snapshot).show_metrics =
      true;
    const changes = diffSiteSnapshots(before, next);
    expect(changes.map((c) => [c.path, c.was, c.now])).toEqual([
      ["seo.allow_indexing", "false", "true"],
      ["experience.feature_flags.show_metrics", "false", "true"],
    ]);
  });

  it("matches array items by key: added, removed, changed and unchanged", () => {
    const before = published();
    (before.navigation as Snapshot).header = [
      link("projects", "Projects"),
      link("about", "About"),
      link("contact", "Contact"),
    ];
    const next = draft();
    (next.navigation as Snapshot).header = [
      link("projects", "Work"), // changed label
      link("contact", "Contact"), // unchanged
      link("blog", "Blog"), // added; "about" removed
    ];
    const changes = diffSiteSnapshots(before, next);
    expect(changes.map((c) => [c.kind, c.label, c.was, c.now, c.path])).toEqual(
      [
        [
          "removed",
          "Header › About",
          "About",
          null,
          "navigation.header[about]",
        ],
        [
          "changed",
          "Header › Work › Label",
          "Projects",
          "Work",
          "navigation.header[projects].label",
        ],
        ["added", "Header › Blog", null, "Blog", "navigation.header[blog]"],
      ]
    );
  });

  it("reports a reorder of shared items on its own", () => {
    const before = published();
    (before.navigation as Snapshot).header = [link("a", "A"), link("b", "B")];
    const next = draft();
    (next.navigation as Snapshot).header = [link("b", "B"), link("a", "A")];
    expect(diffSiteSnapshots(before, next)).toEqual([
      {
        section: "navigation",
        path: "navigation.header.order",
        label: "Header › Order",
        kind: "changed",
        was: "a, b",
        now: "b, a",
      },
    ]);
  });

  it("diffs lists of plain strings as added and removed values", () => {
    const before = published();
    const next = draft();
    ((before.pillars as Snapshot[])[0] as Snapshot).capabilities = ["a", "b"];
    ((next.pillars as Snapshot[])[0] as Snapshot).capabilities = ["b", "c"];
    const changes = diffSiteSnapshots(before, next).filter((c) =>
      c.path.endsWith("capabilities")
    );
    expect(changes.map((c) => [c.kind, c.was, c.now])).toEqual([
      ["removed", "a", null],
      ["added", null, "c"],
    ]);
    expect(changes[0]!.label).toMatch(/^.+ › Capabilities$/);
  });

  it("lists a whole new record field by field", () => {
    const before = published();
    const next = draft();
    next.workflow_example = {
      title: "Intake",
      caption: "Example",
      illustrative: true,
      nodes: [],
    };
    const changes = diffSiteSnapshots(before, next);
    expect(changes.every((c) => c.section === "workflow_example")).toBe(true);
    expect(changes.every((c) => c.kind === "added")).toBe(true);
    expect(changes.map((c) => c.label)).toEqual(
      expect.arrayContaining(["Title", "Caption", "Illustrative"])
    );
  });

  it("is deterministic and groups by section in the documented order", () => {
    const before = published();
    const next = draft();
    (next.seo as Snapshot).default_title = "T";
    (next.identity as Snapshot).short_name = "S";
    (next.contact as Snapshot).location = "L";
    const groups = groupChanges(diffSiteSnapshots(before, next));
    expect(groups.map((g) => [g.section, g.label, g.changes.length])).toEqual([
      ["identity", "Identity", 1],
      ["contact", "Contact", 1],
      ["seo", "SEO and metadata", 1],
    ]);
  });

  it("diffs a section it has no name for and labels it from the key", () => {
    const before: Snapshot = { ...published(), future_section: { a: 1 } };
    const next: Snapshot = { ...draft(), future_section: { a: 2 } };
    const groups = groupChanges(diffSiteSnapshots(before, next));
    expect(groups).toHaveLength(1);
    expect(groups[0]).toMatchObject({
      section: "future_section",
      label: "Future section",
    });
    expect(groups[0]!.changes[0]).toMatchObject({ was: "1", now: "2" });
  });
});

describe("truncate", () => {
  it("keeps short text, collapses whitespace and cuts long text with an ellipsis", () => {
    expect(truncate("  a \n  b ")).toBe("a b");
    const long = "x".repeat(MAX_VALUE_LENGTH + 40);
    const cut = truncate(long);
    expect(Array.from(cut)).toHaveLength(MAX_VALUE_LENGTH);
    expect(cut.endsWith("…")).toBe(true);
  });

  it("never cuts inside a surrogate pair", () => {
    const emoji = "😀".repeat(50);
    const cut = truncate(emoji, 10);
    expect(Array.from(cut)).toHaveLength(10);
    expect(cut).toBe(`${"😀".repeat(9)}…`);
    expect(() => encodeURIComponent(cut)).not.toThrow();
  });

  it("truncates long values inside a diff, on both sides", () => {
    const before = published();
    (before.positioning as Snapshot).long = "a".repeat(5_000);
    const next = draft();
    (next.positioning as Snapshot).long = "b".repeat(5_000);
    const [change] = diffSiteSnapshots(before, next);
    expect(Array.from(change!.was!)).toHaveLength(MAX_VALUE_LENGTH);
    expect(Array.from(change!.now!)).toHaveLength(MAX_VALUE_LENGTH);
  });
});
