import { revalidatePath, revalidateTag } from "next/cache";

export const SITE_CACHE_TAG = "portfolio:v1:site" as const;
export const SITE_CACHE_KEY = "portfolio:v1:site:published" as const;
export const SITE_CACHE_REVALIDATE_SECONDS = 60 * 60;
export const SITE_CACHE_STALE_WHILE_REVALIDATE_SECONDS = 24 * 60 * 60;

/**
 * Route Handlers use stale-while-revalidate tag semantics. `updateTag` is
 * intentionally excluded because it is a Server Action-only primitive.
 */
export const invalidatePublishedSiteCache = async (): Promise<void> => {
  revalidateTag(SITE_CACHE_TAG, "max");
  revalidatePath("/", "layout");
  revalidatePath("/api/site");
};
