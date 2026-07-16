import {
  isPublicContentCacheIndexReady,
  PUBLIC_CONTENT_CACHE_INDEX_TARGETS,
} from "@/lib/db/migrations/202607150014-public-content-cache-invalidation";
import { MIGRATION_REGISTRY } from "@/lib/db/migrations/registry";
import { describe, expect, it } from "vitest";

describe("public content cache invalidation migration", () => {
  it("registers immutable migration 014 immediately after Page composition", () => {
    const ids = MIGRATION_REGISTRY.map(({ id }) => id);
    expect(ids.at(-1)).toBe("202607150014-public-content-cache-invalidation");
    expect(
      ids.indexOf("202607150014-public-content-cache-invalidation")
    ).toBeGreaterThan(ids.indexOf("202607150013-page-composition"));
  });

  it("declares unique event, bounded pending-delivery, and retention indexes", () => {
    expect(
      PUBLIC_CONTENT_CACHE_INDEX_TARGETS.map(({ options }) => options.name)
    ).toEqual([
      "public_content_cache_event_unique",
      "public_content_cache_pending",
      "public_content_cache_delivered_ttl",
    ]);
    expect(PUBLIC_CONTENT_CACHE_INDEX_TARGETS[0]?.options).toMatchObject({
      unique: true,
    });
    expect(PUBLIC_CONTENT_CACHE_INDEX_TARGETS[2]?.options).toMatchObject({
      expireAfterSeconds: 7 * 24 * 60 * 60,
    });
  });

  it("rejects a same-name event index without uniqueness", () => {
    const target = PUBLIC_CONTENT_CACHE_INDEX_TARGETS[0]!;
    expect(
      isPublicContentCacheIndexReady(
        { name: target.options.name, key: target.key },
        target
      )
    ).toBe(false);
    expect(
      isPublicContentCacheIndexReady(
        { name: target.options.name, key: target.key, unique: true },
        target
      )
    ).toBe(true);
  });
});
