import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { getPublicShellLinks } from "@/lib/site/public-shell";
import type { PaletteCommand } from "./commands";

/**
 * The page commands: every navigation link the site shows (header, footer, legal), once each. Built on
 * the server from the published site, so the palette never offers a page the visitor could not
 * otherwise reach; the display preferences are static and live in `commands.ts`.
 */
export function buildPaletteCommands(
  site: TPublicSiteDto
): readonly PaletteCommand[] {
  const seen = new Set<string>();
  const navigate: PaletteCommand[] = [];
  for (const location of ["header", "footer", "legal"] as const) {
    for (const link of getPublicShellLinks(site, location)) {
      if (seen.has(link.href)) continue;
      seen.add(link.href);
      navigate.push({
        id: `nav:${link.href}`,
        label: link.label,
        group: "Navigate",
        href: link.href,
        external: link.external,
      });
    }
  }
  return navigate;
}
