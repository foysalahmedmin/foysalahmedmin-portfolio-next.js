import PageHeaderSection from "@/components/sections/page-header-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy | Foysal Ahmed",
  description: "Privacy Policy for Foysal Ahmed's portfolio and services.",
};

const PrivacyPage = () => {
  const breadcrumbItems = [
    { index: 1, name: "Home", href: "/", icon: "house" },
    { index: 2, name: "Privacy Policy", href: "/privacy" },
  ];

  const sections = [
    {
      title: "Introduction",
      content:
        "Welcome to my portfolio website. I respect your privacy and am committed to protecting your personal data. This privacy policy will inform you about how I look after your personal data when you visit my website and tell you about your privacy rights and how the law protects you.",
    },
    {
      title: "Data I Collect",
      content:
        "I may collect, use, store and transfer different kinds of personal data about you which I have grouped together as follows: Identity Data (name, username), Contact Data (email address), Technical Data (IP address, browser type and version, time zone setting and location).",
    },
    {
      title: "How I Use Your Data",
      content:
        "I will only use your personal data when the law allows me to. Most commonly, I will use your personal data in the following circumstances: To provide and maintain my service, to notify you about changes to my service, and to provide customer support.",
    },
    {
      title: "Cookies",
      content:
        "My website may use 'cookies' to enhance the user experience. You can set your browser to refuse all or some browser cookies, or to alert you when websites set or access cookies. If you disable or refuse cookies, please note that some parts of this website may become inaccessible or not function properly.",
    },
    {
      title: "Data Security",
      content:
        "I have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, I limit access to your personal data to those who have a business need to know.",
    },
  ];

  return (
    <main className="min-h-screen pb-24 lg:pb-32">
      <PageHeaderSection
        title="Privacy Policy"
        subtitle="LEGALS"
        description="Your privacy is important to me. This policy outlines how I handle your data."
        breadcrumbItems={breadcrumbItems}
      />

      <div className="container mx-auto mt-20 px-6">
        <div className="mx-auto max-w-4xl">
          <div className="glass-card space-y-12 p-8 md:p-16">
            {sections.map((section, index) => (
              <section
                key={index}
                className="fade-up"
                style={{ transitionDelay: `${index * 100}ms` }}
              >
                <h2 className="text-foreground mb-6 text-2xl font-bold tracking-tight md:text-3xl">
                  {section.title}
                </h2>
                <div className="text-muted-foreground space-y-4 text-lg leading-relaxed">
                  <p>{section.content}</p>
                </div>
                {index !== sections.length - 1 && (
                  <div className="border-border/50 mt-12 border-b" />
                )}
              </section>
            ))}

            <div className="bg-muted/30 mt-16 rounded-2xl p-8">
              <h3 className="text-foreground mb-4 text-xl font-bold">
                Questions?
              </h3>
              <p className="text-muted-foreground text-lg">
                If you have any questions about this Privacy Policy, please
                contact me at{" "}
                <a
                  href="mailto:foysalahmedmin@gmail.com"
                  className="text-primary font-bold hover:underline"
                >
                  foysalahmedmin@gmail.com
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default PrivacyPage;
