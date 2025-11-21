import type { RootState } from "@/redux/store";
import { useEffect } from "react";
import { useSelector } from "react-redux";

// If needed, extract these later into separate functions
const SettingApplier = () => {
  const direction = useSelector((state: RootState) => state.setting.direction);
  const theme = useSelector((state: RootState) => state.setting.theme);
  const language = useSelector((state: RootState) => state.setting.language);

  // Apply direction
  useEffect(() => {
    if (direction) {
      document.documentElement.setAttribute("dir", direction);
    }
  }, [direction]);

  // Apply theme
  useEffect(() => {
    const root = document.documentElement;

    const applyTheme = (mode: "light" | "dark" | "semi-dark") => {
      root.classList.remove("light", "dark");
      root.classList.add(mode);
    };

    if (theme === "system") {
      const media = window.matchMedia("(prefers-color-scheme: dark)");
      applyTheme(media.matches ? "dark" : "light");

      const listener = (e: MediaQueryListEvent) => {
        applyTheme(e.matches ? "dark" : "light");
      };

      media.addEventListener("change", listener);

      return () => media.removeEventListener("change", listener);
    } else {
      if (theme === "light" || theme === "dark" || theme === "semi-dark") {
        applyTheme(theme);
      }
    }
  }, [theme]);

  // Apply language
  useEffect(() => {
    if (language) {
      document.documentElement.setAttribute("lang", language);
    }
  }, [language]);

  return null;
};

export default SettingApplier;
