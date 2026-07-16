import { parsePageDraftSnapshot } from "@/app/api/pages/page.validation";
import { getSitePublishIssues } from "@/app/api/site/site.policy";
import { siteDraftSnapshotSchema } from "@/app/api/site/site.validation";
import {
  createFoundationSeedManifest,
  getSeedManifestChecksum,
  validateSeedManifest,
} from "@/lib/seed";
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
    expect(manifest.records).toHaveLength(52);
    expect(manifest.media).toHaveLength(6);
  });

  it("seeds exactly five canonical embedded hero owners without publishing them", () => {
    const manifest = createFoundationSeedManifest(actor);
    const site = manifest.records.find(
      (record) => record.seed_key === "site.primary"
    )!;
    const draft = site.payload.draft;
    expect(siteDraftSnapshotSchema.parse(draft).pillars).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "frontend", order: 1 }),
        expect.objectContaining({ key: "backend", order: 2 }),
        expect.objectContaining({ key: "ai_automation", order: 3 }),
        expect.objectContaining({ key: "system_design", order: 4 }),
        expect.objectContaining({ key: "full_stack", order: 5 }),
      ])
    );
    expect(
      (draft as { pillars: { enabled: boolean }[] }).pillars.every(
        (pillar) => !pillar.enabled
      )
    ).toBe(true);
    expect(siteDraftSnapshotSchema.parse(draft).process).toHaveLength(6);
    expect(site.payload.published).toBeNull();
    expect(
      getSitePublishIssues(siteDraftSnapshotSchema.parse(draft))
    ).not.toHaveLength(0);
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
