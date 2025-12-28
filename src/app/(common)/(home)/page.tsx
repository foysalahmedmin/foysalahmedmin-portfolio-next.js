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
import React from "react";

export const metadata: Metadata = {
  title: "Home | Foysal Ahmed",
  description:
    "Welcome to the official portfolio of Foysal Ahmed, a passionate Full-stack Developer based in Bangladesh.",
};

const HomePage: React.FC = () => {
  return (
    <main>
      <HeroSection />
      <AboutSection />
      <ServicesSection />
      <StatisticsSection />
      <ProjectsSection />
      <SkillsSection />
      <ArticlesSection />
      <TestimonialsSection />
      <ContactCTASection />
    </main>
  );
};

export default HomePage;
