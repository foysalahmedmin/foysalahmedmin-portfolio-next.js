import { cn } from "@/lib/utils";
import type { ComponentProps, ElementType } from "react";

/**
 * Glass surface (docs plan 3.5). Use only where something worth seeing through sits behind it.
 *
 * Rules the type cannot enforce, so they are enforced by tests/unit/token-contrast.test.ts:
 * tier 1 chips and bars, tier 2 panels with body text (backdrop at or below --mono-700), tier 3 only
 * on top of the overlay scrim. No glass inside glass: nest `glass-inner` (a flat translucent fill).
 */
export type GlassProps = Omit<ComponentProps<"div">, "ref"> & {
  tier?: 1 | 2 | 3;
  as?: ElementType;
};

const tierClass = { 1: "glass-1", 2: "glass-2", 3: "glass-3" } as const;

export function Glass({ tier = 2, as, className, ...props }: GlassProps) {
  const Comp: ElementType = as ?? "div";
  return (
    <Comp className={cn(tierClass[tier], "rounded-xl", className)} {...props} />
  );
}
