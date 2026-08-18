import type { TFile } from "@/app/api/files/file.type";
import {
  collectSiteFileReferences,
  createEmergencyPublicSite,
  createNeutralSiteDraft,
  getPillarInvariantIssues,
  getSitePublishIssues,
  toPublicSiteMedia,
} from "@/app/api/site/site.policy";
import {
  parseEmptySiteQuery,
  siteDraftSnapshotSchema,
  siteLinkSchema,
} from "@/app/api/site/site.validation";
import { PILLAR_CONTRACT, PILLAR_KEYS } from "@/lib/content/pillars";
import { buildPublishableSiteDraft } from "../helpers/site-fixture";
import { describe, expect, it } from "vitest";

describe("Site five-pillar contract", () => {
  it("derives emergency and editable defaults from one ordered source", () => {
    const emergency = createEmergencyPublicSite();
    const neutral = createNeutralSiteDraft();

    expect(emergency.pillars.map(({ key }) => key)).toEqual(PILLAR_KEYS);
    expect(neutral.pillars.map(({ key }) => key)).toEqual(PILLAR_KEYS);
    expect(emergency.pillars).toHaveLength(PILLAR_CONTRACT.length);
    expect(PILLAR_CONTRACT.length).toBeGreaterThan(1);
    expect(emergency.content_source).toBe("emergency");
    expect(emergency.process).toEqual([]);
    expect(neutral.process).toEqual([]);
  });

  it("normalizes legacy snapshots without Process data to an empty typed list", () => {
    const legacySnapshot = structuredClone(
      buildPublishableSiteDraft()
    ) as unknown as Record<string, unknown>;
    delete legacySnapshot.process;

    const normalized = siteDraftSnapshotSchema.parse(legacySnapshot);

    expect(normalized.process).toEqual([]);
    expect(getSitePublishIssues(normalized)).toEqual([]);
  });

  it("keeps Process keys unique and requires complete enabled steps at publish time", () => {
    const draft = buildPublishableSiteDraft();
    draft.process = [
      {
        key: "discovery",
        title: "Discovery",
        enabled: true,
      },
    ];

    expect(siteDraftSnapshotSchema.safeParse(draft).success).toBe(true);
    expect(getSitePublishIssues(draft)).toEqual(
      expect.arrayContaining(["process.0.summary", "process.0.deliverable"])
    );

    draft.process[0]!.summary = "Align scope and decision boundaries.";
    draft.process[0]!.deliverable = "A reviewed delivery brief.";
    const completeIssues = getSitePublishIssues(draft);
    expect(completeIssues).not.toContain("process.0.summary");
    expect(completeIssues).not.toContain("process.0.deliverable");

    draft.process.push({
      ...draft.process[0]!,
      title: "Duplicate key",
      enabled: false,
    });
    expect(siteDraftSnapshotSchema.safeParse(draft).success).toBe(false);
  });

  it("allows incomplete draft work but blocks it from publication", () => {
    const neutral = createNeutralSiteDraft();

    expect(siteDraftSnapshotSchema.parse(neutral)).toEqual(neutral);
    expect(getSitePublishIssues(neutral)).toEqual(
      expect.arrayContaining([
        "identity.public_name",
        "positioning.canonical",
        "pillars.0.enabled",
      ])
    );
  });

  it("accepts a complete five-pillar snapshot and rejects drift", () => {
    const valid = buildPublishableSiteDraft();
    expect(getSitePublishIssues(valid)).toEqual([]);

    const swapped = structuredClone(valid);
    [swapped.pillars[0], swapped.pillars[1]] = [
      swapped.pillars[1],
      swapped.pillars[0],
    ];
    expect(getPillarInvariantIssues(swapped.pillars)).toEqual(
      expect.arrayContaining(["pillars.0.key", "pillars.1.key"])
    );
    expect(siteDraftSnapshotSchema.safeParse(swapped).success).toBe(false);

    const inconsistentSeo = buildPublishableSiteDraft();
    inconsistentSeo.seo.canonical_url = "https://other.example.com";
    expect(getSitePublishIssues(inconsistentSeo)).toContain(
      "seo.canonical_url"
    );
  });

  it("rejects contradictory visual accessibility metadata", () => {
    const draft = buildPublishableSiteDraft();
    draft.pillars[0]!.visual_file = "507f1f77bcf86cd799439011";
    draft.pillars[0]!.visual_is_decorative = true;
    draft.pillars[0]!.visual_alt_text = "Contradictory announced copy";

    expect(siteDraftSnapshotSchema.safeParse(draft).success).toBe(false);
  });

  it("normalizes link kinds and rejects unsafe destinations", () => {
    expect(
      siteLinkSchema.safeParse({
        key: "admin",
        label: "Admin",
        kind: "internal",
        href: "/admin",
        enabled: true,
      }).success
    ).toBe(false);
    expect(
      siteLinkSchema.safeParse({
        key: "encoded-admin",
        label: "Encoded admin",
        kind: "internal",
        href: "/%61dmin",
        enabled: true,
      }).success
    ).toBe(false);
    expect(
      siteLinkSchema.safeParse({
        key: "external",
        label: "External",
        kind: "external",
        href: "javascript:alert(1)",
        enabled: true,
      }).success
    ).toBe(false);
    expect(
      siteLinkSchema.parse({
        key: "email",
        label: "Email",
        kind: "email",
        enabled: true,
      })
    ).not.toHaveProperty("href");
  });

  it("rejects unknown body/query keys and keeps the snapshot bounded", () => {
    const valid = buildPublishableSiteDraft();
    expect(
      siteDraftSnapshotSchema.safeParse({
        ...valid,
        arbitrary_html: "<b>x</b>",
      }).success
    ).toBe(false);
    expect(() => parseEmptySiteQuery({ fields: "draft" })).toThrow(
      "does not accept query parameters"
    );
  });

  it("maps every Site File field to an exact managed-media purpose", () => {
    const draft = buildPublishableSiteDraft();
    draft.brand.logo_light_file = "507f1f77bcf86cd799439011";
    draft.brand.profile_file = "507f1f77bcf86cd799439012";
    draft.seo.default_og_file = "507f1f77bcf86cd799439013";
    draft.fallbacks.article_file = "507f1f77bcf86cd799439014";

    expect(collectSiteFileReferences(draft)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "brand.logo_light_file",
          purposes: ["logo"],
        }),
        expect.objectContaining({
          field: "brand.profile_file",
          purposes: ["profile"],
        }),
        expect.objectContaining({
          field: "seo.default_og_file",
          purposes: ["social"],
        }),
        expect.objectContaining({
          field: "fallbacks.article_file",
          purposes: ["article"],
        }),
      ])
    );
  });

  it("projects only public rendering metadata from File records", () => {
    const blurDataUrl = "data:image/webp;base64,UklGRg==";
    const file = {
      _id: { toString: () => "507f1f77bcf86cd799439011" },
      url: "https://cdn.example.com/profile.webp",
      access: "public",
      provider: "cloudinary",
      checksum: "ab".repeat(32),
      provenance: { prompt: "must never be public" },
      metadata: {
        width: 1200,
        height: 1200,
        public_id: "private-provider-key",
      },
      alt_text: "  Abstract profile visual  ",
      is_decorative: false,
      focal_point: { x: 0.64, y: 0.48 },
      dominant_color: "#AABBCC",
      blur_data_url: blurDataUrl,
    } as unknown as TFile;

    const projected = toPublicSiteMedia(file);
    expect(projected).toEqual({
      id: "507f1f77bcf86cd799439011",
      url: "https://cdn.example.com/profile.webp",
      alt_text: "Abstract profile visual",
      is_decorative: false,
      width: 1200,
      height: 1200,
      focal_point: { x: 0.64, y: 0.48 },
      dominant_color: "#aabbcc",
      blur_data_url: blurDataUrl,
    });
    expect(projected).not.toHaveProperty("provider");
    expect(projected).not.toHaveProperty("checksum");
    expect(projected).not.toHaveProperty("provenance");
    expect(projected).not.toHaveProperty("metadata.public_id");
  });

  it("drops invalid presentation metadata and lets decorative purpose win", () => {
    const file = {
      _id: { toString: () => "507f1f77bcf86cd799439012" },
      url: "https://cdn.example.com/decorative.webp",
      access: "public",
      mimetype: "image/webp",
      metadata: { width: 1200, height: Number.NaN },
      alt_text: "This contradictory copy must not be announced",
      is_decorative: true,
      focal_point: { x: 1.2, y: 0.5 },
      dominant_color: "not-a-color",
      blur_data_url: "data:image/svg+xml;base64,PHN2Zy8+",
    } as unknown as TFile;

    expect(toPublicSiteMedia(file)).toEqual({
      id: "507f1f77bcf86cd799439012",
      url: "https://cdn.example.com/decorative.webp",
      is_decorative: true,
    });
  });
});
