"use client";

import { cn } from "@/lib/utils";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

const SHOW_AFTER_PX = 400;

const ScrollToTop = () => {
  const [isVisible, setIsVisible] = useState(false);

  // One frame at a time, reading only the scroll offset (the page's size is not needed, and reading it
  // lays the page out). A restored scroll position fires a scroll event, so there is no read at mount.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setIsVisible(window.scrollY > SHOW_AFTER_PX);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={cn(
        "fixed right-4 bottom-24 z-50 transition-all duration-500 ease-in-out xl:right-8 xl:bottom-8",
        isVisible
          ? "translate-y-0 opacity-100"
          : "-translate-y-[120vh] opacity-0"
      )}
    >
      <Button
        variant="default"
        shape="icon"
        size="lg"
        onClick={scrollToTop}
        className="shadow-primary/20 size-12 rounded-full shadow-2xl hover:-translate-y-1"
        aria-label="Scroll to top"
      >
        <ArrowUp className="size-6" />
      </Button>
    </div>
  );
};

export default ScrollToTop;
