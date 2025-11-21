import AboutSection from "@/components/(common)/home-page/about-section";
import HeroSection from "@/components/(common)/home-page/hero-section";
import React from "react";

const HomePage: React.FC = () => {
  return (
    <main>
      <HeroSection />
      <AboutSection />
    </main>
  );
};

export default HomePage;
