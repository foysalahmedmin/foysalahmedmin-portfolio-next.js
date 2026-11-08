import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { CtaBand } from "@/components/templates/cta-band";

/** The `contact-cta` Page section. The band itself is the shared template component (docs plan 3.13). */
const ContactCTASection = ({
  site,
}: {
  site: TPublicSiteDto;
  /** `banner` is the home page: it also carries what happens after you write (`site.next_steps`). */
  layout?: string;
}) => <CtaBand site={site} />;

export default ContactCTASection;
