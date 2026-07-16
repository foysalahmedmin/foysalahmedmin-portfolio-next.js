"use client";

import { calculateSectionProgress, clampUnit } from "@/lib/motion/parallax";
import { cn } from "@/lib/utils";
import { useMotion } from "@/providers/motion-provider";
import { useParallaxSource } from "@/providers/parallax-provider";
import {
  useCallback,
  useEffect,
  useRef,
  type ComponentProps,
  type CSSProperties,
} from "react";

type ParallaxLayerProps = ComponentProps<"div"> & {
  depth?: "subtle" | "medium" | "strong";
  axis?: "x" | "y";
  pointerStrength?: 0 | 0.25 | 0.5 | 1;
  progress?: number;
};

const depthPixels = {
  subtle: 16,
  medium: 32,
  strong: 56,
} as const;

export default function ParallaxLayer({
  depth = "subtle",
  axis = "y",
  pointerStrength = 0,
  progress,
  className,
  style,
  ...props
}: ParallaxLayerProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { canAnimate } = useMotion();
  const { subscribe, requestFrame } = useParallaxSource();

  const update = useCallback(
    (frame: {
      viewport_height: number;
      pointer_x: number;
      pointer_y: number;
    }) => {
      const element = ref.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const sectionProgress =
        progress === undefined
          ? calculateSectionProgress({
              top: rect.top,
              height: rect.height,
              viewport_height: frame.viewport_height,
            })
          : clampUnit(progress);

      const pointerValue = axis === "x" ? frame.pointer_x : frame.pointer_y;
      const normalizedProgress = (sectionProgress - 0.5) * 2;
      const offset =
        (normalizedProgress + pointerValue * pointerStrength) *
        depthPixels[depth];
      element.style.setProperty("--parallax-offset", `${offset.toFixed(2)}px`);
    },
    [axis, depth, pointerStrength, progress]
  );

  useEffect(() => {
    if (!canAnimate) {
      ref.current?.style.setProperty("--parallax-offset", "0px");
      return;
    }

    const unsubscribe = subscribe(update);
    requestFrame();
    return unsubscribe;
  }, [canAnimate, requestFrame, subscribe, update]);

  return (
    <div
      ref={ref}
      data-parallax-layer=""
      data-parallax-axis={axis}
      className={cn("parallax-layer", className)}
      style={
        {
          ...style,
          "--parallax-offset": "0px",
        } as CSSProperties
      }
      {...props}
    />
  );
}
