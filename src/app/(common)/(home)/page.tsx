import AboutSection from "@/components/(common)/home-page/AboutSection";
import HeroSection from "@/components/(common)/home-page/HeroSection";
import OperationClient from "@/components/(common)/home-page/OperationClient";
import React from "react";

type TSectionComponentProps = {
  className?: string;
  isActive: boolean;
};

type TSectionItem = {
  id: string;
  name: string;
  component: React.ElementType<TSectionComponentProps>;
};

const sections: TSectionItem[] = [
  { id: "home", name: "Home", component: HeroSection },
  { id: "about", name: "About", component: AboutSection },
];

const HomePage : React.FC =() => {
  return <OperationClient sections={sections} />;
}

export default HomePage
