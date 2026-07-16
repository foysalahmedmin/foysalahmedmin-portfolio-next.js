import "server-only";

import { credentialDefinition } from "@/app/api/credentials/credential.definition";
import { faqDefinition } from "@/app/api/faqs/faq.definition";
import { legalDocumentDefinition } from "@/app/api/legal-documents/legal-document.definition";
import { PAGE_CACHE_TAG, pageCacheTag } from "@/app/api/pages/page.cache";
import type {
  THomePagePayload,
  TResolvedPublishedPagePayload,
} from "@/app/api/pages/page-resolver.type";
import type { TPageRouteKey } from "@/app/api/pages/page.type";
import { serviceDefinition } from "@/app/api/services/service.definition";
import { skillGroupDefinition } from "@/app/api/skill-groups/skill-group.definition";
import { skillDefinition } from "@/app/api/skills/skill.definition";
import { testimonialDefinition } from "@/app/api/testimonials/testimonial.definition";
import { timelineEntryDefinition } from "@/app/api/timeline/timeline-entry.definition";
import { SITE_CACHE_TAG } from "@/app/api/site/site.cache";
import {
  ARTICLE_PUBLIC_CACHE_TAG,
  PROJECT_PUBLIC_CACHE_TAG,
  PUBLISHED_PAGE_RESOLVER_CACHE_TAG,
} from "@/lib/content/public-cache-tags";
import { unstable_cache } from "next/cache";
import { resolvePublishedPageUncached } from "./published-page-resolver";

export const PUBLISHED_PAGE_RESOLVER_TTL_SECONDS = 60 * 60;

export const PUBLISHED_PAGE_RESOLVER_TAGS = Object.freeze([
  PUBLISHED_PAGE_RESOLVER_CACHE_TAG,
  PAGE_CACHE_TAG,
  SITE_CACHE_TAG,
  ARTICLE_PUBLIC_CACHE_TAG,
  PROJECT_PUBLIC_CACHE_TAG,
  serviceDefinition.cache_tag,
  skillGroupDefinition.cache_tag,
  skillDefinition.cache_tag,
  timelineEntryDefinition.cache_tag,
  credentialDefinition.cache_tag,
  faqDefinition.cache_tag,
  testimonialDefinition.cache_tag,
  legalDocumentDefinition.cache_tag,
]);

export const getPublishedPagePayload = async (
  routeKey: TPageRouteKey
): Promise<TResolvedPublishedPagePayload> =>
  unstable_cache(
    () => resolvePublishedPageUncached(routeKey),
    ["portfolio", "published-page-resolver", routeKey],
    {
      tags: [...PUBLISHED_PAGE_RESOLVER_TAGS, pageCacheTag(routeKey)],
      revalidate: PUBLISHED_PAGE_RESOLVER_TTL_SECONDS,
    }
  )();

export const getHomePagePayload = async (): Promise<THomePagePayload> => {
  const payload = await getPublishedPagePayload("home");
  return payload as THomePagePayload;
};
