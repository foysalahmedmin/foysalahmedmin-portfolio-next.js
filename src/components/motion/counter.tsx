"use client";

import { formatCount, type CountFormat } from "@/lib/motion/counter";
import { cn } from "@/lib/utils";
import { useEffect, useRef } from "react";
import { useEngine } from "./engine-provider";

type CounterProps = Partial<CountFormat> & {
  value: number;
  className?: string;
};

/**
 * A number that counts up once when it first scrolls into view (M10). Use it only for verified or
 * derived figures. The server renders the final text, the screen-reader text is always the final
 * text, and without the engine (reduced, off, touch, no JavaScript) nothing animates.
 */
export function Counter({
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  locale = "en",
  className,
}: CounterProps) {
  const visual = useRef<HTMLSpanElement>(null);
  const engine = useEngine();
  const text = formatCount(value, { decimals, prefix, suffix, locale });

  useEffect(() => {
    const element = visual.current;
    if (!engine || !element) return;
    return engine.behaviors.counter(element, {
      value,
      decimals,
      prefix,
      suffix,
      locale,
    });
  }, [engine, value, decimals, prefix, suffix, locale]);

  return (
    <span className={cn("tabular-nums", className)}>
      <span className="sr-only">{text}</span>
      <span ref={visual} aria-hidden="true" data-counter="">
        {text}
      </span>
    </span>
  );
}
