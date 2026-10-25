"use client";

import { Button } from "@/components/ui/button";
import { measureThenMutate } from "@/lib/dom/frame-batch";
import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

/**
 * A horizontal rail of cards with the one standard pair of arrows. The cards are plain list items in
 * the HTML (they scroll with touch, trackpad and keyboard without this component); the arrows move
 * one card at a time, are disabled at the ends, and glide unless the visitor asked for less motion.
 */
export function Rail({
  label,
  head,
  className,
  children,
}: {
  label: string;
  /** The section heading; the arrows sit on its row, so the cards below keep the full width. */
  head?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });

  useEffect(() => {
    const element = track.current;
    if (!element) return;
    const read = () => ({
      start: element.scrollLeft <= 2,
      end: element.scrollLeft >= element.scrollWidth - element.clientWidth - 2,
    });
    const commit = () => setEdges(read());
    // The first reading shares one layout with the page's other mount-time measurements; later ones
    // (scrolling, resizing) find the layout clean
    measureThenMutate(read, setEdges);
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        commit();
      });
    };
    element.addEventListener("scroll", onScroll, { passive: true });
    const observer = new ResizeObserver(commit);
    observer.observe(element);
    return () => {
      element.removeEventListener("scroll", onScroll);
      observer.disconnect();
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const go = (direction: 1 | -1) => {
    const element = track.current;
    const card = element?.querySelector<HTMLElement>("li");
    if (!element || !card) return;
    const gap = Number.parseFloat(getComputedStyle(element).columnGap) || 0;
    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollBy({
      left: direction * (card.offsetWidth + gap),
      behavior: calm ? "auto" : "smooth",
    });
  };

  return (
    <div className={cn("rail", className)}>
      <div className="rail-head">
        {head}
        <div
          className="rail-controls"
          role="group"
          aria-label={`${label} controls`}
        >
          <Button
            type="button"
            variant="outline"
            size="lg"
            shape="icon"
            aria-label="Previous"
            disabled={edges.start}
            onClick={() => go(-1)}
          >
            <ArrowLeft className="size-5" aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            shape="icon"
            aria-label="Next"
            disabled={edges.end}
            onClick={() => go(1)}
          >
            <ArrowRight className="size-5" aria-hidden="true" />
          </Button>
        </div>
      </div>
      <ul
        ref={track}
        className="rail-track"
        role="list"
        aria-label={label}
        tabIndex={0}
      >
        {children}
      </ul>
    </div>
  );
}
