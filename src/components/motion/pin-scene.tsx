"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { useEngine } from "./engine-provider";

type PinSceneProps = {
  /** Pin length in viewport heights, 100 to 300 (a pin never lasts more than three screens). */
  length?: number;
  /** How many beats the scene has; each is one screen of scroll or less. */
  beats: number;
  className?: string;
  children: ReactNode;
};

/**
 * A pinned scroll scene (docs plan 3.7.4). Every beat is in the HTML in reading order. With the
 * engine, the stage sticks to the top of the screen for `length` screens of scroll and the scene writes
 * `--pin-progress`, `--pin-position` and `data-beat`; without it (reduced, off, touch, no JavaScript)
 * the beats simply stack as a plain list, with no pin and no extra height.
 */
export function PinScene({
  length = 300,
  beats,
  className,
  children,
}: PinSceneProps) {
  const ref = useRef<HTMLElement>(null);
  const engine = useEngine();

  useEffect(() => {
    const element = ref.current;
    if (!engine || !element) return;
    return engine.behaviors.pinScene(element, { length, beats });
  }, [engine, length, beats]);

  return (
    <section
      ref={ref}
      data-pin-scene=""
      data-beats={beats}
      className={cn("relative", className)}
    >
      <div data-pin-stage="">{children}</div>
    </section>
  );
}

/** One beat of a `PinScene`. While pinned, beats cross-fade by position (hold 0.7, change 0.3). */
export function PinBeat({
  index,
  className,
  children,
}: {
  index: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      data-pin-beat={index}
      className={cn(className)}
      style={{ "--beat": index } as CSSProperties}
    >
      {children}
    </div>
  );
}
