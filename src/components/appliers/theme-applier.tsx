"use client";

import { useSetting } from "@/state/setting-store";
import { useEffect } from "react";

const ThemeApplier = () => {
  const theme = useSetting((setting) => setting.theme);
  const direction = useSetting((setting) => setting.direction);
  const language = useSetting((setting) => setting.language);

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
