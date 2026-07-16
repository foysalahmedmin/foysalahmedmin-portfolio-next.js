import { buildRobotsRoute } from "@/lib/metadata/metadata-routes";
import { readPublishedSite } from "@/lib/site/published-site";
import type { MetadataRoute } from "next";

export default async function robots(): Promise<MetadataRoute.Robots> {
  return buildRobotsRoute(await readPublishedSite());
}
