import { buildManifestRoute } from "@/lib/metadata/metadata-routes";
import { readPublishedSite } from "@/lib/site/published-site";
import type { MetadataRoute } from "next";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  return buildManifestRoute(await readPublishedSite());
}
