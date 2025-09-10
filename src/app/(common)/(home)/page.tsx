import AboutSection from "@/components/(common)/home-page/AboutSection";
import HeroSection from "@/components/(common)/home-page/HeroSection";
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
