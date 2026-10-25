import type { TPublicSiteDto } from "@/app/api/site/site.type";
import AboutDetailsSection from "@/components/(common)/about-page/about-details-section";

/** The home page's introduction: the same practice section as About, without the process. */
const AboutSection = ({ site }: { site: TPublicSiteDto }) => (
  <AboutDetailsSection site={site} compact id="about" />
);

export default AboutSection;
