"use client";

import type { RefObject } from "react";
import { useEffect, useState } from "react";

type ScrollPosition = {
  scrollTop: number;
  scrollBottom: number;
  scrollDirection: "up" | "down";
};

export const useScrollPosition = (
  ref: RefObject<HTMLElement> | null = null
): ScrollPosition => {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollBottom, setScrollBottom] = useState(0);
  const [scrollDirection, setScrollDirection] = useState<"up" | "down">("up");

  useEffect(() => {
    let ticking = false;
    let prevScrollTop = 0;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const target = ref?.current ?? document.documentElement;
          // Use window.scrollY for global scroll if no ref matches cleaner behavior
          const currentScrollTop = ref?.current
            ? target.scrollTop
            : window.scrollY;
          const scrollHeight = target.scrollHeight || 0;
          const clientHeight = target.clientHeight || 0;
          const scrollBottom = scrollHeight - currentScrollTop - clientHeight;

          // Only update if values changed to prevent re-renders
          setScrollTop((prev) =>
            prev !== currentScrollTop ? currentScrollTop : prev
          );
          setScrollBottom((prev) =>
            prev !== scrollBottom ? scrollBottom : prev
          );

          if (Math.abs(currentScrollTop - prevScrollTop) > 0) {
            setScrollDirection(
              currentScrollTop > prevScrollTop ? "down" : "up"
            );
          }

          prevScrollTop = currentScrollTop;
          ticking = false;
        });

        ticking = true;
      }
    };

    const scrollTarget = ref?.current ?? window;
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });

    // Initial check
    handleScroll();

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
    };
  }, [ref]);

  return { scrollTop, scrollBottom, scrollDirection };
};
