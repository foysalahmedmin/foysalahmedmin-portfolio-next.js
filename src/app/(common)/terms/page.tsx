import PageHeaderSection from "@/components/sections/page-header-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service | Foysal Ahmed",
  description: "Terms of Service for Foysal Ahmed's portfolio and services.",
};

const TermsPage = () => {
  const breadcrumbItems = [
    { index: 1, name: "Home", href: "/", icon: "house" },
    { index: 2, name: "Terms of Service", href: "/terms" },
  ];

  const sections = [
    {
      title: "Agreement to Terms",
      content:
        "By accessing or using my website, you agree to be bound by these Terms of Service and all applicable laws and regulations. If you do not agree with any of these terms, you are prohibited from using or accessing this site.",
    },
    {
      title: "Use License",
      content:
        "Permission is granted to temporarily download one copy of the materials (information or software) on Foysal Ahmed's website for personal, non-commercial transitory viewing only. This is the grant of a license, not a transfer of title.",
    },
    {
      title: "Disclaimer",
      content:
        "The materials on this website are provided on an 'as is' basis. I make no warranties, expressed or implied, and hereby disclaim and negate all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.",
    },
    {
      title: "Limitations",
      content:
        "In no event shall Foysal Ahmed or his suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on this website.",
    },
    {
      title: "Governing Law",
      content:
        "These terms and conditions are governed by and construed in accordance with the laws of Bangladesh and you irrevocably submit to the exclusive jurisdiction of the courts in that State or location.",
    },
  ];

  return (
    <main className="min-h-screen pb-24 lg:pb-32">
      <PageHeaderSection
        title="Terms of Service"
        subtitle="LEGALS"
        description="Please read these terms carefully before using my services."
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
                Legal Contact
              </h3>
              <p className="text-muted-foreground text-lg">
                For any legal inquiries regarding these terms, please reach out
                via{" "}
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

export default TermsPage;
