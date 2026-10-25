import { JsonLdScript } from "@/components/content/json-ld-script";
import Footer from "@/components/partials/footer";
import Header from "@/components/partials/Header";
import { PublicSurface } from "@/components/surface/public-surface";
import ScrollToTop from "@/components/ui/scroll-to-top";
import { buildWebSiteJsonLd } from "@/lib/metadata/json-ld";
import { buildPaletteCommands } from "@/lib/palette/build";
import { readPublishedSite } from "@/lib/site/published-site";
import type { ReactNode } from "react";
import { publicFontVariables } from "./fonts";

const CommonLayout = async ({ children }: { children: ReactNode }) => {
  const site = await readPublishedSite();

  return (
    <PublicSurface
      fontClassNames={publicFontVariables}
      commands={buildPaletteCommands(site)}
    >
      <JsonLdScript data={buildWebSiteJsonLd(site)} />
      <a
        href="#main-content"
        className="bg-foreground text-background fixed top-3 left-3 z-[2000] -translate-y-24 px-4 py-3 font-semibold transition-transform focus-visible:translate-y-0"
      >
        Skip to main content
      </a>
      <Header site={site} />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <Footer site={site} />
      <ScrollToTop />
    </PublicSurface>
  );
};

export default CommonLayout;
