"use client";

import { useAppSelector } from "@/redux/hooks";
import { useEffect } from "react";

const ThemeApplier = () => {
  const { theme, direction, language } = useAppSelector((state) => state.setting);

  useEffect(() => {
    const root = document.documentElement;
    
    // Theme logic
    if (theme) {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      const mode = 
        theme === "dark" 
          ? "dark" 
          : theme === "light" 
          ? "light" 
          : prefersDark 
          ? "dark" 
          : "light";
          
      root.classList.remove("light", "dark");
      root.classList.add(mode);
    }

    // Direction logic
    if (direction) {
      root.setAttribute("dir", direction);
    }

    // Language logic
    if (language) {
      root.setAttribute("lang", language);
    }
  }, [theme, direction, language]);

  return null;
};

export default ThemeApplier;
