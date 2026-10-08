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
        filter: { featured: true, pillar: "software_developer" },
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
      "case-studies",
      "articles",
      "videos",
      "contact",
      "privacy",
      "terms",
    ]);
    expect(PAGE_SECTION_KINDS).not.toContain("custom-component");
    expect(PAGE_SECTION_KINDS).toEqual(
      expect.arrayContaining(["case-study-collection", "video-collection"])
    );
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

describe("case study and video Page sections", () => {
  const section = (kind: string, filter: Record<string, unknown>) => ({
    seo: { noindex: false },
    sections: [
      {
        key: "library",
        kind,
        visible: true,
        layout: "grid",
        item_limit: 4,
        source: { mode: "automatic", filter },
      },
    ],
  });

  it("filters videos by shape and rejects shapes that do not exist", () => {
    expect(
      parsePageDraftSnapshot("home", section("video-collection", { aspect_ratio: "reel" }))
    ).toBeDefined();
    expect(() =>
      parsePageDraftSnapshot("home", section("video-collection", { aspect_ratio: "square" }))
    ).toThrow();
    expect(() =>
      parsePageDraftSnapshot("home", section("video-collection", { pillar: "system_architect" }))
    ).toThrow();
  });

  it("filters case studies by role and featured state", () => {
    expect(
      parsePageDraftSnapshot(
        "case-studies",
        section("case-study-collection", { featured: true, pillar: "ai_automation" })
      )
    ).toBeDefined();
    expect(() =>
      parsePageDraftSnapshot("case-studies", section("case-study-collection", { shape: "reel" }))
    ).toThrow();
  });

  it("keeps each collection on its own fixed routes", () => {
    expect(() =>
      parsePageDraftSnapshot("articles", section("video-collection", {}))
    ).toThrow();
    expect(() =>
      parsePageDraftSnapshot("videos", section("case-study-collection", {}))
    ).toThrow();
    expect(parsePageDraftSnapshot("videos", section("video-collection", {}))).toBeDefined();
    expect(
      parsePageDraftSnapshot("home", section("case-study-collection", { featured: true }))
    ).toBeDefined();
  });

  it("allows two video sections on one Page so each shape gets its own", () => {
    const draft = {
      seo: { noindex: false },
      sections: ["landscape", "reel"].map((shape) => ({
        key: `videos-${shape}`,
        kind: "video-collection",
        visible: true,
        layout: "grid",
        item_limit: 3,
        source: { mode: "automatic", filter: { aspect_ratio: shape } },
      })),
    };
    expect(parsePageDraftSnapshot("home", draft).sections).toHaveLength(2);
  });
});
