"use client";

import { cn } from "@/lib/utils";
import {
  useEffect,
  useRef,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react";
import { useEngine } from "./engine-provider";

type PinSceneProps = Omit<
  ComponentProps<"section">,
  "ref" | "children" | "onProgress"
> & {
  /** Pin length in viewport heights, 100 to 300 (a pin never lasts more than three screens). */
  length?: number;
  /** How many beats the scene has; each is one screen of scroll or less. */
  beats: number;
  /** Scrubbed scroll progress (0..1), for scenes that live outside the DOM (the 3D camera). */
  onProgress?: (progress: number) => void;
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
  onProgress,
  className,
  children,
  ...props
}: PinSceneProps) {
  const ref = useRef<HTMLElement>(null);
  const engine = useEngine();

  useEffect(() => {
    const element = ref.current;
    if (!engine || !element) return;
    return engine.behaviors.pinScene(element, { length, beats, onProgress });
  }, [engine, length, beats, onProgress]);

  return (
    <section
      ref={ref}
      data-pin-scene=""
      data-beats={beats}
      className={cn("relative", className)}
      {...props}
    >
      <div data-pin-stage="">{children}</div>
    </section>
  );
}

/** One beat of a `PinScene`. While pinned, beats cross-fade on the story clock (hold 0.7, change 0.3). */
export function PinBeat({
  index,
  className,
  style,
  children,
  ...props
}: Omit<ComponentProps<"div">, "ref"> & {
  index: number;
}) {
  return (
    <div
      data-pin-beat={index}
      className={cn(className)}
      style={{ "--beat": index, ...style } as CSSProperties}
      {...props}
    >
      {children}
    </div>
  );
}
