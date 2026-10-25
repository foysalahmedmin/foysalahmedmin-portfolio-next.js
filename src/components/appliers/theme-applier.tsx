"use client";

import { applyThemeMode } from "@/lib/theme";
import { useSetting } from "@/state/setting-store";
import { useEffect } from "react";

const ThemeApplier = () => {
  const theme = useSetting((setting) => setting.theme);
  const direction = useSetting((setting) => setting.direction);
  const language = useSetting((setting) => setting.language);

  useEffect(() => {
    const root = document.documentElement;

    if (theme) applyThemeMode(theme);

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
