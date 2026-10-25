"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, type ElementType } from "react";
import { useEngine } from "./engine-provider";

type TextRevealProps = {
  as?: "h1" | "h2" | "h3" | "h4" | "p" | "span" | "div";
  /** Plain text only: the engine splits it into lines and restores it on cleanup. */
  children: string;
  className?: string;
};

/**
 * A statement whose lines settle into place from inside a mask (M02). The server render is the
 * complete text; the engine enhances it only when the text starts below the first screen, so a
 * headline is never hidden before or while JavaScript loads. Without the engine it is plain text.
 */
export function TextReveal({
  as = "span",
  children,
  className,
}: TextRevealProps) {
  const Tag = as as ElementType;
  const ref = useRef<HTMLElement>(null);
  const engine = useEngine();

  useEffect(() => {
    const element = ref.current;
    if (!engine || !element) return;
    return engine.behaviors.textReveal(element);
  }, [engine, children]);

  // Keyed by the text: a changed headline remounts instead of fighting the split DOM
  return (
    <Tag ref={ref} key={children} data-text-reveal="" className={cn(className)}>
      {children}
    </Tag>
  );
}
