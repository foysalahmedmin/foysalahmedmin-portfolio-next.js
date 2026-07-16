import { JsonLdScript } from "@/components/content/json-ld-script";
import Footer from "@/components/partials/footer";
import Header from "@/components/partials/Header";
import ScrollToTop from "@/components/ui/scroll-to-top";
import { buildWebSiteJsonLd } from "@/lib/metadata/json-ld";
import { readPublishedSite } from "@/lib/site/published-site";
import type { ReactNode } from "react";

const CommonLayout = async ({ children }: { children: ReactNode }) => {
  const site = await readPublishedSite();

  return (
    <>
      <JsonLdScript data={buildWebSiteJsonLd(site)} />
      <a
        href="#main-content"
        className="bg-background text-foreground focus-visible:ring-ring fixed top-3 left-3 z-[2000] -translate-y-24 rounded-lg px-4 py-3 font-semibold shadow-lg transition-transform focus-visible:translate-y-0 focus-visible:ring-2"
      >
        Skip to main content
      </a>
      <Header site={site} />
      <div id="main-content" tabIndex={-1}>
        {children}
      </div>
      <Footer site={site} />
      <ScrollToTop />
    </>
  );
};

export default CommonLayout;
