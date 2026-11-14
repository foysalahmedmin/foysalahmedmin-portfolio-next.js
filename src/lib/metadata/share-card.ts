import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { buildCanonicalUrl } from "./metadata-url";
import { boundedText } from "./open-graph";

/** Route of the generated default share image (`app/share-card/route.tsx`). */
export const SHARE_CARD_PATH = "/share-card";

export type TShareCardText = { name: string; line?: string; host: string };

/**
 * What the default share card prints. Only published Site facts: no name or no canonical domain
 * means no card, so the preview falls back to text only instead of showing something unverified.
 */
export const buildShareCardText = (
  site: TPublicSiteDto
): TShareCardText | null => {
  if (site.content_source !== "published") return null;
  const name = boundedText(
    site.identity.public_name ?? site.identity.short_name,
    60
  );
  const canonical = buildCanonicalUrl(site, "/");
  if (!name || !canonical) return null;
  const line = boundedText(
    site.positioning.compact ?? site.positioning.canonical,
    140
  );
  return { name, ...(line ? { line } : {}), host: new URL(canonical).host };
};
