import {
  isPageIndexReady,
  PAGE_INDEX_TARGETS,
} from "@/lib/db/migrations/202607150013-page-composition";
import { MIGRATION_REGISTRY } from "@/lib/db/migrations/registry";
import { describe, expect, it } from "vitest";

describe("Page composition migration", () => {
  it("uses the reserved 013 id after repeatable content", () => {
    const ids = MIGRATION_REGISTRY.map(({ id }) => id);
    expect(ids).toContain("202607150013-page-composition");
    expect(ids.indexOf("202607150013-page-composition")).toBeGreaterThan(
      ids.indexOf("202607150012-repeatable-content-foundation")
    );
  });

  it("declares bounded route and durable invalidation indexes", () => {
    expect(PAGE_INDEX_TARGETS.map(({ options }) => options.name)).toEqual([
      "page_route_locale_unique",
      "page_published_route",
      "page_admin_updated",
      "page_cache_revision_unique",
      "page_cache_pending_delivery",
      "page_cache_delivered_ttl",
    ]);
    expect(PAGE_INDEX_TARGETS[0]?.options).toMatchObject({ unique: true });
    expect(JSON.stringify(PAGE_INDEX_TARGETS)).not.toMatch(
      /draft\.sections|body|html/
    );
  });

  it("rejects a same-name route index without uniqueness", () => {
    const target = PAGE_INDEX_TARGETS[0]!;
    expect(
      isPageIndexReady({ name: target.options.name, key: target.key }, target)
    ).toBe(false);
    expect(
      isPageIndexReady(
        { name: target.options.name, key: target.key, unique: true },
        target
      )
    ).toBe(true);
  });
});
