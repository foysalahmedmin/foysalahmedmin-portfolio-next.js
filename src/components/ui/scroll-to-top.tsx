"use client";

import { useScrollPosition } from "@/hooks/ui/use-scroll-position";
import { cn } from "@/lib/utils";
import { ArrowUp } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../ui/button";

const ScrollToTop = () => {
  const { scrollTop } = useScrollPosition();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (scrollTop > 400) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  }, [scrollTop]);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <div
      className={cn(
        "fixed bottom-8 right-8 z-50 transition-all duration-500 ease-in-out",
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
        className="size-12 rounded-full shadow-2xl shadow-primary/20 hover:-translate-y-1"
        aria-label="Scroll to top"
      >
        <ArrowUp className="size-6" />
      </Button>
    </div>
  );
};

export default ScrollToTop;
