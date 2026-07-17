import { JsonLdScript } from "@/components/content/json-ld-script";
import ContactContentSection from "@/components/(common)/contact-page/contact-content-section";
import PageHeaderSection from "@/components/sections/page-header-section";
import {
  buildBreadcrumbJsonLd,
  buildWebPageJsonLd,
} from "@/lib/metadata/json-ld";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { readPublishedSite } from "@/lib/site/published-site";
import type { Metadata } from "next";

const CONTACT_TITLE = "Contact";
const fallbackContactDescription =
  "Share the goals, constraints, and context for a potential product engineering engagement.";

const getContactDescription = (
  site: Awaited<ReturnType<typeof readPublishedSite>>
): string => {
  return site.positioning.client_promise || fallbackContactDescription;
};

export const generateMetadata = async (): Promise<Metadata> => {
  const site = await readPublishedSite();
  return buildPageMetadata(site, {
    pathname: "/contact",
    title: CONTACT_TITLE,
    description: getContactDescription(site),
  });
};

const ContactPage = async () => {
  const site = await readPublishedSite();
  const description = getContactDescription(site);
  const breadcrumbItems = [
    { index: 1, name: "Home", href: "/", icon: "house" },
    { index: 2, name: "Contact", href: "/contact" },
  ];

  return (
    <main className="min-h-screen">
      <JsonLdScript
        data={[
          buildWebPageJsonLd(site, {
            pathname: "/contact",
            title: CONTACT_TITLE,
            description,
          }),
          buildBreadcrumbJsonLd(site, [
            { name: "Home", pathname: "/" },
            { name: CONTACT_TITLE, pathname: "/contact" },
          ]),
        ].filter((item) => item !== null)}
      />
      <PageHeaderSection
        title="Get in Touch"
        description={description}
        breadcrumbItems={breadcrumbItems}
      />

      <ContactContentSection site={site} />
    </main>
  );
};

export default ContactPage;
