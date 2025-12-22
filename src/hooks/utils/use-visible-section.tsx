"use client";

import { useEffect, useMemo, useState } from "react";

export const useVisibleSection = (ids?: string[], threshold = 0.5) => {
  const [visibleSection, setVisibleSection] = useState<string | null>(null);

  const memoizedIds = useMemo(() => ids ?? [], [ids]);

  useEffect(() => {
    if (memoizedIds.length === 0) return;

    const observers: IntersectionObserver[] = [];

    memoizedIds.forEach((sectionId) => {
      const element = document.getElementById(sectionId);
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setVisibleSection(sectionId);
          }
        },
        { threshold }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach((observer) => observer.disconnect());
    };
  }, [memoizedIds, threshold]);

  return { visibleSection };
};
