import ContactContentSection from "@/components/(common)/contact-page/contact-content-section";
import GoogleMapSection from "@/components/(common)/contact-page/google-map-section";
import PageHeaderSection from "@/components/sections/page-header-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact | Foysal Ahmed",
  description:
    "Get in touch with Foysal Ahmed for collaborations, opportunities, or just a friendly chat.",
};

const ContactPage = () => {
  const breadcrumbItems = [
    { index: 1, name: "Home", href: "/", icon: "house" },
    { index: 2, name: "Contact", href: "/contact" },
  ];

  return (
    <main className="min-h-screen">
      <PageHeaderSection
        title="Get in Touch"
        description="I'm always open to new opportunities, collaborations, or just a friendly chat. Feel free to reach out using the form below or through my contact details."
        breadcrumbItems={breadcrumbItems}
      />

      <ContactContentSection />

      <GoogleMapSection />
    </main>
  );
};

export default ContactPage;
