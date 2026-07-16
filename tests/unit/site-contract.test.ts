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
    expect(emergency.pillars).toHaveLength(5);
    expect(PILLAR_CONTRACT).toHaveLength(5);
    expect(emergency.content_source).toBe("emergency");
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
      alt_text: "Abstract profile visual",
    } as unknown as TFile;

    const projected = toPublicSiteMedia(file);
    expect(projected).toEqual({
      id: "507f1f77bcf86cd799439011",
      url: "https://cdn.example.com/profile.webp",
      alt_text: "Abstract profile visual",
      width: 1200,
      height: 1200,
    });
    expect(projected).not.toHaveProperty("provider");
    expect(projected).not.toHaveProperty("checksum");
    expect(projected).not.toHaveProperty("provenance");
    expect(projected).not.toHaveProperty("metadata.public_id");
  });
});
