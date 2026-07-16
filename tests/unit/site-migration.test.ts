import {
  isSiteIndexReady,
  SITE_INDEX_TARGETS,
} from "@/lib/db/migrations/202607150010-site-foundation";
import { MIGRATION_REGISTRY } from "@/lib/db/migrations/registry";
import { describe, expect, it } from "vitest";

describe("Site foundation migration", () => {
  it("is registered after File provenance with its immutable id", () => {
    const ids = MIGRATION_REGISTRY.map(({ id }) => id);
    expect(ids).toContain("202607150010-site-foundation");
    expect(ids.indexOf("202607150010-site-foundation")).toBeGreaterThan(
      ids.indexOf("202607150009-file-metadata-provenance")
    );
  });

  it("declares singleton and durable invalidation indexes only", () => {
    expect(SITE_INDEX_TARGETS.map(({ options }) => options.name)).toEqual([
      "site_key_1",
      "site_published_at",
      "site_cache_revision_unique",
      "site_cache_pending_delivery",
      "site_cache_delivered_ttl",
    ]);
    expect(
      SITE_INDEX_TARGETS.find(({ options }) => options.name === "site_key_1")
        ?.options
    ).toMatchObject({ unique: true });
    expect(JSON.stringify(SITE_INDEX_TARGETS)).not.toMatch(
      /public_email|public_phone|draft\./
    );
  });

  it("does not accept a same-name singleton index without uniqueness", () => {
    const target = SITE_INDEX_TARGETS[0];
    expect(
      isSiteIndexReady({ name: "site_key_1", key: { site_key: 1 } }, target)
    ).toBe(false);
    expect(
      isSiteIndexReady(
        { name: "site_key_1", key: { site_key: 1 }, unique: true },
        target
      )
    ).toBe(true);
  });
});
