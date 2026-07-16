import "server-only";

import {
  SITE_CACHE_KEY,
  SITE_CACHE_REVALIDATE_SECONDS,
  SITE_CACHE_TAG,
} from "@/app/api/site/site.cache";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { readPublishedSiteUncached } from "@/app/api/site/site.service";
import { unstable_cache } from "next/cache";

const readCachedPublishedSite = unstable_cache(
  readPublishedSiteUncached,
  [SITE_CACHE_KEY],
  {
    tags: [SITE_CACHE_TAG],
    revalidate: SITE_CACHE_REVALIDATE_SECONDS,
  }
);

export const readPublishedSite = async () => {
  try {
    return await readCachedPublishedSite();
  } catch {
    console.error("site_published_reader_unavailable", {
      error_code: "published_reader_unavailable",
    });
    return createEmergencyPublicSite();
  }
};
