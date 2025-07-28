"use client";

import Icon from "@/components/ui/Icon";
import { SOCIALS } from "@/config";
import usePageScroll from "@/hooks/ui/usePageScroll";
import useHash from "@/hooks/utils/useHash";
import { cn } from "@/lib/utils";
import React, { useCallback, useMemo } from "react";

type SectionComponentProps = {
  className?: string;
  isActive: boolean;
};

type SectionItem = {
  id: string;
  name: string;
  component: React.ElementType<SectionComponentProps>;
};

type SectionProps = {
  item: SectionItem;
  index: number;
  currentIndex: number;
  onNext: () => void;
  onPrev: () => void;
};

interface TOperationClientProps {
  sections: SectionItem[];
}

const Section = ({ item, index, currentIndex, onNext, onPrev }: SectionProps) => {
  const { setRef } = usePageScroll({ onPrev, onNext });
  const Component = item.component as React.ElementType<SectionComponentProps>;

  return (
    <section
      id={item.id}
      ref={setRef(index)}
      className={cn(
        "group absolute inset-0 size-full overflow-y-auto overflow-x-hidden bg-background text-foreground transition-all duration-700",
        { active: index === currentIndex },
        { "-translate-y-full": index < currentIndex && index !== currentIndex },
      )}
      style={{ zIndex: index * -1 }}
    >
      <Component isActive={index === currentIndex} />
    </section>
  );
};

const OperationClient = ({ sections }: TOperationClientProps) => {
  const { hash } = useHash();

  const currentIndex = useMemo(() => {
    const index = sections.findIndex((section) => section.id === hash);
    return index >= 0 ? index : 0;
  }, [hash, sections]);

  const onNext = useCallback(() => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < sections.length) {
      window.location.hash = sections[nextIndex].id;
    }
  }, [currentIndex, sections]);

  const onPrev = useCallback(() => {
    const prevIndex = currentIndex - 1;
    if (prevIndex >= 0) {
      window.location.hash = sections[prevIndex].id;
    }
  }, [currentIndex, sections]);

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
      <div className="absolute left-4 top-1/2 hidden h-1/2 w-1 -translate-y-1/2 overflow-hidden rounded-full bg-foreground/25 lg:left-8 lg:block">
        <div
          style={{ height: `${((currentIndex + 1) / sections.length) * 100}%` }}
          className="w-full bg-primary transition-all duration-500 ease-in-out"
        />
      </div>

      {/* Right Social Links */}
      <div
        className={cn(
          "absolute right-4 top-1/2 hidden h-1/2 -translate-y-1/2 flex-col items-center gap-4 overflow-hidden rounded-full lg:right-8 lg:flex",
          { dark: currentIndex === 0 },
        )}
      >
        <div className="w-1 flex-1 rounded-full bg-foreground/25" />
        <ul className="flex flex-col gap-2">
          {SOCIALS.map((item, index) => (
            <li key={index}>
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex size-8 items-center justify-center rounded-full border border-current text-foreground transition-all duration-500 hover:border-primary hover:bg-primary/5 hover:text-primary"
              >
                <Icon name={item.icon} />
              </a>
            </li>
          ))}
        </ul>
        <div className="w-1 flex-1 rounded-full bg-foreground/25" />
      </div>
    </main>
  );
};

export default OperationClient;
