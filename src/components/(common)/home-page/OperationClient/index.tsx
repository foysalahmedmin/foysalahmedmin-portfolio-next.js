"use client";

import Icon from "@/components/ui/Icon";
import { SOCIALS } from "@/config";
import usePageScroll from "@/hooks/ui/usePageScroll";
import useHash from "@/hooks/utils/useHash";
import { cn } from "@/lib/utils";
import React, { useCallback, useMemo } from "react";
import AboutSection from "../AboutSection";
import HeroSection from "../HeroSection";

/* -----------------------------
   Types
----------------------------- */
type SectionItem = {
  id: string;
  name: string;
  element: React.ReactElement;
};

type SectionProps = {
  item: SectionItem;
  index: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
};

/* -----------------------------
   Sections (lazy-loaded)
----------------------------- */
const sections: SectionItem[] = [
  { id: "home", name: "Home", element: <HeroSection /> },
  { id: "about", name: "About", element: <AboutSection /> },
];

/* -----------------------------
   Section Component
----------------------------- */
const Section: React.FC<SectionProps> = ({
  item,
  index,
  currentIndex,
  onNext,
  onPrev,
}) => {
  const { setRef } = usePageScroll({ onPrev, onNext });

  return (
    <section
      id={item.id}
      ref={setRef(index)}
      className={cn(
        "group bg-background text-foreground absolute inset-0 size-full overflow-x-hidden overflow-y-auto transition-all duration-700",
        { active: index === currentIndex },
        { "-translate-y-full": index < currentIndex }
      )}
      style={{ zIndex: index * -1 }}
    >
      {item.element}
    </section>
  );
};

/* -----------------------------
   Main Component
----------------------------- */
const OperationClient: React.FC = () => {
  const { hash } = useHash();

  const currentIndex = useMemo(() => {
    const index = sections.findIndex((section) => section.id === hash);
    return index >= 0 ? index : 0;
  }, [hash]);

  const onNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < sections.length) {
      window.location.hash = sections[nextIndex].id;
    }
  }, [currentIndex]);

  const onPrev = useCallback(() => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      window.location.hash = sections[prevIndex].id;
    }
  }, [currentIndex]);

  return (
    <main className="relative z-10 h-screen w-screen overflow-hidden">
      {sections.map((section, index) => (
        <Section
          key={section.id}
          item={section}
          index={index}
          currentIndex={currentIndex}
          onNext={onNext}
          onPrev={onPrev}
        />
      ))}

      {/* Left Progress Bar */}
      <div className="bg-foreground/25 absolute top-1/2 left-4 hidden h-1/2 w-1 -translate-y-1/2 overflow-hidden rounded-full lg:left-8 lg:block">
        <div
          style={{ height: `${((currentIndex + 1) / sections.length) * 100}%` }}
          className="bg-primary w-full transition-all duration-500 ease-in-out"
        />
      </div>

      {/* Right Social Links */}
      <div
        className={cn(
          "absolute top-1/2 right-4 hidden h-1/2 -translate-y-1/2 flex-col items-center gap-4 overflow-hidden rounded-full lg:right-8 lg:flex"
        )}
      >
        <div className="bg-foreground/25 w-1 flex-1 rounded-full" />
        <ul className="flex flex-col gap-2">
          {SOCIALS.map((item, index) => (
            <li key={index}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-foreground hover:border-primary hover:bg-primary/5 hover:text-primary flex size-8 items-center justify-center rounded-full border border-current transition-all duration-500"
              >
                <Icon name={item.icon} />
              </a>
            </li>
          ))}
        </ul>
        <div className="bg-foreground/25 w-1 flex-1 rounded-full" />
      </div>
    </main>
  );
};

export default OperationClient;
