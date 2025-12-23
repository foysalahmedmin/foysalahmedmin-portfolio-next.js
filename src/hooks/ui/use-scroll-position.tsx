"use client";

import type { RefObject} from "react";
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
    let prevScrollTop = 0;

    const handleScroll = () => {
      const target = ref?.current ?? document.documentElement;

      const currentScrollTop = target.scrollTop || 0;
      const scrollHeight = target.scrollHeight || 0;
      const clientHeight = target.clientHeight || 0;
      const scrollBottom = scrollHeight - currentScrollTop - clientHeight;

      setScrollTop(currentScrollTop);
      setScrollBottom(scrollBottom);
      setScrollDirection(currentScrollTop > prevScrollTop ? "down" : "up");

      prevScrollTop = currentScrollTop;
    };

    const scrollTarget = ref?.current ?? window;
    scrollTarget.addEventListener("scroll", handleScroll, { passive: true });

    handleScroll();

    return () => {
      scrollTarget.removeEventListener("scroll", handleScroll);
    };
  }, [ref]);

  return { scrollTop, scrollBottom, scrollDirection };
};
