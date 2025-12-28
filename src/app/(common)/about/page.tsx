import AboutDetailsSection from "@/components/(common)/about-page/about-details-section";
import CoursesSection from "@/components/(common)/about-page/courses-section";
import EducationSection from "@/components/(common)/about-page/education-section";
import ExperienceSection from "@/components/(common)/about-page/experience-section";
import ContactCTASection from "@/components/sections/contact-cta-section";
import PageHeaderSection from "@/components/sections/page-header-section";
import ServicesSection from "@/components/sections/services-section";
import SkillsSection from "@/components/sections/skills-section";
import StatisticsSection from "@/components/sections/statistics-section";
import TestimonialsSection from "@/components/sections/testimonials-section";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About | Foysal Ahmed",
  description:
    "Dedicated web developer with a passion for building scalable applications and solving complex problems.",
};

const AboutPage = () => {
  const breadcrumbItems = [
    { index: 1, name: "Home", href: "/", icon: "house" },
    { index: 2, name: "About", href: "/about" },
  ];

  return (
    <main className="min-h-screen">
      <PageHeaderSection
        title="About Me"
        description="Dedicated web developer with a passion for building scalable applications and solving complex problems."
        breadcrumbItems={breadcrumbItems}
      />
      <AboutDetailsSection />
      <ServicesSection />
      <StatisticsSection />
      <SkillsSection />
      <ExperienceSection />
      <EducationSection />
      <CoursesSection />
      <TestimonialsSection />
      <ContactCTASection />
    </main>
  );
};

export default AboutPage;
