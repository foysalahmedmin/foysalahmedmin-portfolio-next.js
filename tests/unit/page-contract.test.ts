import {
  getPagePublishStructureIssues,
  reorderPageSections,
} from "@/app/api/pages/page.policy";
import {
  PAGE_ROUTE_KEYS,
  PAGE_SECTION_KINDS,
  type TPageDraftSnapshot,
} from "@/app/api/pages/page.type";
import {
  pageDraftSnapshotSchema,
  parsePageDraftSnapshot,
} from "@/app/api/pages/page.validation";
import { describe, expect, it } from "vitest";

const homeDraft = (): TPageDraftSnapshot => ({
  seo: { noindex: false },
  sections: [
    {
      key: "hero",
      kind: "site-hero",
      visible: true,
      layout: "immersive",
      source: { mode: "system" },
    },
    {
      key: "projects",
      kind: "project-collection",
      visible: true,
      layout: "grid",
      item_limit: 6,
      source: {
        mode: "automatic",
        filter: { featured: true, pillar: "full_stack" },
      },
    },
  ],
});

describe("fixed-route Page composition contract", () => {
  it("keeps every route and section kind code-owned", () => {
    expect(PAGE_ROUTE_KEYS).toEqual([
      "home",
      "about",
      "projects",
      "articles",
      "contact",
      "privacy",
      "terms",
    ]);
    expect(PAGE_SECTION_KINDS).not.toContain("custom-component");
  });

  it("accepts safe sources while rejecting arbitrary rendering controls", () => {
    expect(parsePageDraftSnapshot("home", homeDraft())).toEqual(homeDraft());
    expect(
      pageDraftSnapshotSchema.safeParse({
        ...homeDraft(),
        component_path: "../../server-only",
      }).success
    ).toBe(false);
    expect(
      pageDraftSnapshotSchema.safeParse({
        seo: { noindex: false },
        sections: [
          {
            ...homeDraft().sections[0],
            heading: "<script>alert(1)</script>",
          },
        ],
      }).success
    ).toBe(false);
  });

  it("enforces route compatibility and legal-document type", () => {
    expect(() => parsePageDraftSnapshot("contact", homeDraft())).toThrow();
    expect(() =>
      parsePageDraftSnapshot("privacy", {
        seo: { noindex: false },
        sections: [
          {
            key: "legal",
            kind: "legal-document",
            visible: true,
            layout: "document",
            item_limit: 1,
            source: { mode: "automatic", filter: { type: "terms" } },
          },
        ],
      })
    ).toThrow();
  });

  it("bounds item limits and curated references without content bodies", () => {
    const invalid = homeDraft();
    invalid.sections[1] = {
      ...invalid.sections[1]!,
      item_limit: 25,
      source: {
        mode: "curated",
        ids: ["507f1f77bcf86cd799439011"],
      },
    };
    expect(pageDraftSnapshotSchema.safeParse(invalid).success).toBe(false);
    expect(JSON.stringify(homeDraft())).not.toMatch(
      /content|rich_content|html|script/
    );
  });

  it("reorders only exact permutations and preserves section configuration", () => {
    const draft = homeDraft();
    const reordered = reorderPageSections(draft, ["projects", "hero"]);
    expect(reordered.sections.map(({ key }) => key)).toEqual([
      "projects",
      "hero",
    ]);
    expect(() => reorderPageSections(draft, ["hero"])).toThrow(
      "every current section"
    );
  });

  it("blocks empty and structurally incomplete publications", () => {
    const hidden = homeDraft();
    hidden.sections = hidden.sections.map((section) => ({
      ...section,
      visible: false,
    }));
    expect(getPagePublishStructureIssues("home", hidden)).toEqual(
      expect.arrayContaining(["sections.visible", "sections.required"])
    );
  });
});
