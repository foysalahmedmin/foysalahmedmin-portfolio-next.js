"use client";

import { measureThenMutate } from "@/lib/dom/frame-batch";
import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export type TraceRailItem = Readonly<{ id: string; label: string }>;

type TraceRailProps = {
  /** The chapters, in page order. Each `id` must match a section on the page. */
  items: readonly TraceRailItem[];
  label?: string;
  className?: string;
};

/**
 * The signal rail down the left edge (M06): one tick per chapter, the current chapter marked, and a
 * hairline that fills with page progress. It works in every tier because it needs no animation
 * library: the active tick comes from an IntersectionObserver and the progress from one passive
 * scroll listener that writes a CSS variable. Reduced motion keeps the ticks and the active mark and
 * hides the fill (see engine.css).
 */
export function TraceRail({
  items,
  label = "Chapters",
  className,
}: TraceRailProps) {
  const nav = useRef<HTMLElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(items[0]?.id ?? "");

  useEffect(() => {
    const element = nav.current;
    if (!element || items.length === 0) return;

    // The chapter that crosses the middle of the viewport is the current one
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: "-45% 0px -50% 0px" }
    );
    for (const item of items) {
      const section = document.getElementById(item.id);
      if (section) observer.observe(section);
    }

    // Progress is written straight to a CSS variable on the next frame; React is not involved
    let frame = 0;
    const readProgress = () => {
      const scrollable =
        document.documentElement.scrollHeight - window.innerHeight;
      const progress = scrollable > 0 ? window.scrollY / scrollable : 0;
      return Math.min(1, Math.max(0, progress)).toFixed(4);
    };
    const writeProgress = (value: string) => {
      element.style.setProperty("--trace-progress", value);
      bar.current?.style.setProperty("--trace-progress", value);
    };
    // While scrolling the layout is clean, so the read is free; at mount and on resize it is batched
    const update = () => {
      frame = 0;
      writeProgress(readProgress());
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    measureThenMutate(readProgress, writeProgress);
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [items]);

  // Keyboard and screen-reader users land on the chapter, not just beside it. The engine does the
  // same after a smooth scroll; it prevents the default first, in which case this is skipped.
  const focusChapter = (
    event: React.MouseEvent<HTMLAnchorElement>,
    id: string
  ) => {
    if (event.defaultPrevented) return;
    const section = document.getElementById(id);
    if (!section) return;
    if (!section.hasAttribute("tabindex"))
      section.setAttribute("tabindex", "-1");
    section.focus({ preventScroll: true });
  };

  return (
    <>
      <nav
        ref={nav}
        aria-label={label}
        data-trace-rail=""
        className={cn(className)}
      >
        <ol role="list">
          {items.map((item, index) => (
            <li key={item.id}>
              <a
                href={`#${item.id}`}
                data-active={item.id === active || undefined}
                aria-current={item.id === active ? "location" : undefined}
                onClick={(event) => focusChapter(event, item.id)}
              >
                <span aria-hidden="true" data-trace-tick="" />
                <span data-trace-label="">
                  <span aria-hidden="true" className="tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>{" "}
                  {item.label}
                </span>
              </a>
            </li>
          ))}
        </ol>
        <span aria-hidden="true" data-trace-line="">
          <span data-trace-fill="" />
        </span>
      </nav>
      <div ref={bar} data-trace-progressbar="" aria-hidden="true">
        <span />
      </div>
    </>
  );
}
