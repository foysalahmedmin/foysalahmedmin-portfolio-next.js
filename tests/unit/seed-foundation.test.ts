import { parsePageDraftSnapshot } from "@/app/api/pages/page.validation";
import { getSitePublishIssues } from "@/app/api/site/site.policy";
import { siteDraftSnapshotSchema } from "@/app/api/site/site.validation";
import {
  createFoundationSeedManifest,
  getSeedManifestChecksum,
  resolveSeedMediaBindings,
  validateSeedManifest,
} from "@/lib/seed";
import { PILLAR_CONTRACT } from "@/lib/content/pillars";
import { ObjectId } from "mongodb";
import { describe, expect, it } from "vitest";

const actor = { _id: new ObjectId(), role: "super-admin" as const };

describe("truthful foundation seed", () => {
  it("is schema-valid, deterministic, and independent of the operational actor", () => {
    const manifest = validateSeedManifest(createFoundationSeedManifest(actor));
    const otherActorManifest = createFoundationSeedManifest({
      _id: new ObjectId(),
      role: "super-admin",
    });
    expect(getSeedManifestChecksum(manifest)).toBe(
      getSeedManifestChecksum(otherActorManifest)
    );
    expect(manifest.records).toHaveLength(59);
    expect(manifest.media).toHaveLength(PILLAR_CONTRACT.length + 1);
  });

  it("seeds every canonical embedded hero owner without publishing them", () => {
    const manifest = createFoundationSeedManifest(actor);
    const site = manifest.records.find(
      (record) => record.seed_key === "site.primary"
    )!;
    const draft = site.payload.draft;
    expect(siteDraftSnapshotSchema.parse(draft).pillars).toEqual(
      expect.arrayContaining(
        PILLAR_CONTRACT.map(({ key, order }) =>
          expect.objectContaining({ key, order })
        )
      )
    );
    expect(
      (draft as { pillars: { enabled: boolean }[] }).pillars.every(
        (pillar) => !pillar.enabled
      )
    ).toBe(true);
    expect(siteDraftSnapshotSchema.parse(draft).process).toHaveLength(6);
    expect(site.media_bindings).toEqual(
      expect.arrayContaining([
        ...PILLAR_CONTRACT.map(({ key }, index) =>
          expect.objectContaining({
            media_key: `hero.${key}`,
            field_path: `draft.pillars.${index}.visual_file`,
            required: false,
          })
        ),
        expect.objectContaining({
          media_key: "site.default-social",
          field_path: "draft.seo.default_og_file",
          required: false,
        }),
      ])
    );
    expect(site.payload.published).toBeNull();
    expect(
      getSitePublishIssues(siteDraftSnapshotSchema.parse(draft))
    ).not.toHaveLength(0);
  });

  it("binds ready managed media to the Site draft through provider-neutral seed references", () => {
    const manifest = createFoundationSeedManifest(actor);
    const fileIds = Array.from(
      { length: PILLAR_CONTRACT.length + 1 },
      (_unused, index) => `64b${String(index + 1).padStart(21, "0")}`
    );

    const resolved = resolveSeedMediaBindings({
      records: manifest.records,
      media: manifest.media.map((item, index) => ({
        media_key: item.media_key,
        action: "created" as const,
        file_id: fileIds[index],
        source_sha256: "a".repeat(64),
      })),
    });
    const site = resolved.records.find(
      (record) => record.seed_key === "site.primary"
    )!;
    const draft = site.payload.draft as {
      pillars: Array<{ visual_file?: string }>;
      seo: { default_og_file?: string };
    };

    expect(draft.pillars.map((pillar) => pillar.visual_file)).toEqual(
      fileIds.slice(0, PILLAR_CONTRACT.length)
    );
    expect(draft.seo.default_og_file).toBe(fileIds[PILLAR_CONTRACT.length]);
    expect(resolved.references).toHaveLength(PILLAR_CONTRACT.length + 1);
    expect(resolved.references).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "draft.pillars.3.visual_file",
          file_id: fileIds[3],
          target_collection: "sites",
        }),
        expect.objectContaining({
          field: "draft.seo.default_og_file",
          file_id: fileIds[PILLAR_CONTRACT.length],
          target_collection: "sites",
        }),
      ])
    );
    expect(() =>
      site.validate({
        ...site.payload,
        created_by: actor._id,
        updated_by: actor._id,
        created_at: new Date("2026-07-17T00:00:00.000Z"),
        updated_at: new Date("2026-07-17T00:00:00.000Z"),
      })
    ).not.toThrow();
  });

  it("uses seven fixed draft Page compositions that satisfy the Page schemas", () => {
    const pages = createFoundationSeedManifest(actor).records.filter(
      (record) => record.collection === "pages"
    );
    expect(pages.map((record) => record.payload.route_key)).toEqual([
      "home",
      "about",
      "projects",
      "articles",
      "contact",
      "privacy",
      "terms",
    ]);
    for (const page of pages) {
      expect(() =>
        parsePageDraftSnapshot(
          page.payload.route_key as Parameters<
            typeof parsePageDraftSnapshot
          >[0],
          page.payload.draft
        )
      ).not.toThrow();
      expect(page.payload.published).toBeNull();
      expect(
        (page.payload.draft as { seo: { noindex: boolean } }).seo.noindex
      ).toBe(true);
    }
    const home = pages.find((page) => page.payload.route_key === "home")!;
    expect(
      (
        home.payload.draft as {
          sections: Array<{ key: string; layout: string }>;
        }
      ).sections.find((section) => section.key === "pillars")?.layout
    ).toBe("sticky");
    expect(
      (
        home.payload.draft as {
          sections: Array<{ key: string; kind: string; layout: string }>;
        }
      ).sections.find((section) => section.key === "faqs")?.kind
    ).toBe("faq-list");
    expect(
      (
        home.payload.draft as {
          sections: Array<{ key: string; layout: string }>;
        }
      ).sections.find((section) => section.key === "faqs")?.layout
    ).toBe("list");
    expect(
      (
        home.payload.draft as {
          sections: Array<{ key: string; layout: string }>;
        }
      ).sections.find((section) => section.key === "process")?.layout
    ).toBe("numbered");
  });

  it("omits every unverified claim collection and records pending media truthfully", () => {
    const manifest = createFoundationSeedManifest(actor);
    const collections = new Set(
      manifest.records.map((record) => record.collection)
    );
    for (const collection of [
      "testimonials",
      "projects",
      "articles",
      "timeline_entries",
      "credentials",
    ]) {
      expect(collections.has(collection as never)).toBe(false);
    }
    for (const collection of [
      "services",
      "skill_groups",
      "skills",
      "faqs",
      "legal_documents",
    ]) {
      expect(collections.has(collection as never)).toBe(true);
    }
    expect(
      manifest.media.every((item) => item.source.kind === "pending_generated")
    ).toBe(true);
    expect(
      manifest.records
        .filter((record) => record.collection === "seed_media_intents")
        .every(
          (record) =>
            record.payload.state === "awaiting_source" &&
            record.payload.file_id === null &&
            record.payload.source_sha256 === null
        )
    ).toBe(true);
  });
});
