import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => mocks);

import {
  invalidatePublishedPageCache,
  PAGE_CACHE_TAG,
  pageCacheTag,
} from "@/app/api/pages/page.cache";

describe("published Page invalidation", () => {
  beforeEach(() => {
    mocks.revalidateTag.mockReset();
    mocks.revalidatePath.mockReset();
  });

  it("invalidates bounded global/route tags and only the fixed route path", async () => {
    await invalidatePublishedPageCache("articles");
    expect(mocks.revalidateTag).toHaveBeenCalledWith(PAGE_CACHE_TAG, "max");
    expect(mocks.revalidateTag).toHaveBeenCalledWith(
      pageCacheTag("articles"),
      "max"
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/articles");
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/api/pages/articles");
  });
});
