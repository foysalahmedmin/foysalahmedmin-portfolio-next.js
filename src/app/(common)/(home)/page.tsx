import AboutSection from "@/components/(common)/home-page/about-section";
import ArticlesSection from "@/components/(common)/home-page/articles-section";
import HeroSection from "@/components/(common)/home-page/hero-section";
import ProjectsSection from "@/components/(common)/home-page/projects-section";
import ContactCTASection from "@/components/sections/contact-cta-section";
import ServicesSection from "@/components/sections/services-section";
import SkillsSection from "@/components/sections/skills-section";
import StatisticsSection from "@/components/sections/statistics-section";
import TestimonialsSection from "@/components/sections/testimonials-section";
import type { Metadata } from "next";
import React, { Suspense } from "react";

// Projects and articles are loaded from MongoDB at request time.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Home | Foysal Ahmed",
  description:
    "Welcome to the official portfolio of Foysal Ahmed, a passionate Full-stack Developer based in Bangladesh.",
};

import FaqSection from "@/components/sections/faq-section";
import GithubActivitySection from "@/components/sections/github-activity-section";
import WorkProcessSection from "@/components/sections/work-process-section";

const HomePage: React.FC = () => {
  return (
    <main>
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <WorkProcessSection />
      <StatisticsSection />
      <Suspense fallback={null}>
        <ProjectsSection />
      </Suspense>
      <SkillsSection />
      <GithubActivitySection />
      <Suspense fallback={null}>
        <ArticlesSection />
      </Suspense>
      <TestimonialsSection />
      <FaqSection />
      <ContactCTASection />
    </main>
  );
};

export default HomePage;
