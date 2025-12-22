"use client";

import { useEffect, useState } from "react";

export const useIsDark = () => {
  const getIsDark = () =>
    typeof document !== "undefined" &&
    document.documentElement.classList.contains("dark");

  const [isDark, setIsDark] = useState<boolean>(getIsDark);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(getIsDark());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
};
