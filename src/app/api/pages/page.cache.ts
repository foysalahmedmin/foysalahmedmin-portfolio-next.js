import { revalidatePath, revalidateTag } from "next/cache";
import { PAGE_ROUTE_PATHS, type TPageRouteKey } from "./page.type";

export const PAGE_CACHE_TAG = "portfolio:v1:pages" as const;
export const pageCacheTag = (routeKey: TPageRouteKey): string =>
  `${PAGE_CACHE_TAG}:${routeKey}`;

export const invalidatePublishedPageCache = async (
  routeKey: TPageRouteKey
): Promise<void> => {
  revalidateTag(PAGE_CACHE_TAG, "max");
  revalidateTag(pageCacheTag(routeKey), "max");
  revalidatePath(PAGE_ROUTE_PATHS[routeKey]);
  revalidatePath(`/api/pages/${routeKey}`);
};
