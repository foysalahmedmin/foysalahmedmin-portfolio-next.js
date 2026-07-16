import { beforeEach, describe, expect, it, vi } from "vitest";

const cacheMocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => cacheMocks);

import {
  invalidatePublishedSiteCache,
  SITE_CACHE_TAG,
} from "@/app/api/site/site.cache";

describe("published Site invalidation", () => {
  beforeEach(() => {
    cacheMocks.revalidateTag.mockReset();
    cacheMocks.revalidatePath.mockReset();
  });

  it("uses one bounded tag with Route Handler stale semantics", async () => {
    await invalidatePublishedSiteCache();

    expect(cacheMocks.revalidateTag).toHaveBeenCalledWith(
      SITE_CACHE_TAG,
      "max"
    );
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(cacheMocks.revalidatePath).toHaveBeenCalledWith("/api/site");
    expect(cacheMocks).not.toHaveProperty("updateTag");
  });
});
