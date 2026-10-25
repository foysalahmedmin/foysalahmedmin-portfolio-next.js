"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, type ReactNode } from "react";
import { useEngineState } from "./engine-provider";

type MagneticProps = {
  children: ReactNode;
  /** Fraction of the pointer offset the element follows (0 to 1). */
  strength?: number;
  /** Extra reach around the element, in px. */
  radius?: number;
  className?: string;
};

/**
 * Pulls its child toward the pointer when the pointer is near (M14). Tier 3 only (fine pointer, a
 * capable device); everywhere else it is a plain wrapper. The component renders once: the follow
 * runs in the engine through `quickTo`, never through React state (rule F3).
 */
export function Magnetic({
  children,
  strength = 0.35,
  radius = 64,
  className,
}: MagneticProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const { engine, tier } = useEngineState();
  const enabled = engine !== null && tier === 3;

  useEffect(() => {
    const element = ref.current;
    if (!engine || !enabled || !element) return;
    return engine.behaviors.magnetic(element, { strength, radius });
  }, [engine, enabled, strength, radius]);

  return (
    <span ref={ref} data-magnetic="" className={cn("inline-block", className)}>
      {children}
    </span>
  );
}
