import AboutSection from "@/components/(common)/home-page/about-section";
import ArticlesSection from "@/components/(common)/home-page/articles-section";
import ContactCTASection from "@/components/(common)/home-page/contact-cta-section";
import HeroSection from "@/components/(common)/home-page/hero-section";
import ProjectsSection from "@/components/(common)/home-page/projects-section";
import SkillsSection from "@/components/(common)/home-page/skills-section";
import StatisticsSection from "@/components/(common)/home-page/statistics-section";
import TestimonialsSection from "@/components/(common)/home-page/testimonials-section";
import React from "react";

const HomePage: React.FC = () => {
  return (
    <main>
      <HeroSection />
      <div id="about">
        <AboutSection />
      </div>
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
