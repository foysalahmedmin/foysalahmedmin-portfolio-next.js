import ContactContentSection from "@/components/(common)/contact-page/contact-content-section";
import PageHeaderSection from "@/components/sections/page-header-section";
import type { Metadata } from "next";
import { readPublishedSite } from "@/lib/site/published-site";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Share the goals, constraints, and context for a potential product engineering engagement.",
};

const ContactPage = async () => {
  const site = await readPublishedSite();
  const breadcrumbItems = [
    { index: 1, name: "Home", href: "/", icon: "house" },
    { index: 2, name: "Contact", href: "/contact" },
  ];

  return (
    <main className="min-h-screen">
      <PageHeaderSection
        title="Get in Touch"
        description={
          site.positioning.client_promise ||
          "Share the problem, desired outcome, timeline, and constraints through the protected inquiry workflow."
        }
        breadcrumbItems={breadcrumbItems}
      />

      <ContactContentSection site={site} />
    </main>
  );
};

export default ContactPage;
