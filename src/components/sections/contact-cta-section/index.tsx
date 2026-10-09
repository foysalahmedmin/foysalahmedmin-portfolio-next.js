import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { CtaBand } from "@/components/templates/cta-band";

/** The `contact-cta` Page section. The band itself is the shared template component (docs plan 3.13). */
const ContactCTASection = ({ site }: { site: TPublicSiteDto }) => (
  <CtaBand site={site} />
);

export default ContactCTASection;
