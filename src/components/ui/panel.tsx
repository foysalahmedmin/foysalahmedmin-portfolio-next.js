import { cn } from "@/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ElementType } from "react";

const panelVariants = cva("relative rounded-lg", {
  variants: {
    variant: {
      /** A hairline-bordered surface. The default; works on every tone. */
      flat: "border border-line-2 bg-card text-card-foreground",
      /** Glass tier 2. Only over a rich backdrop (3D scene, texture, pinned layers). */
      glass: "glass-2 text-foreground",
      /** The opposite tone of its surroundings (declared through data-tone). */
      inverse: "bg-background text-foreground",
    },
    ticks: {
      true: "ticks",
      false: "",
    },
    padding: {
      none: "",
      sm: "p-4",
      md: "p-6",
      lg: "p-8 md:p-10",
    },
  },
  defaultVariants: { variant: "flat", ticks: false, padding: "md" },
});

export type PanelProps = Omit<ComponentProps<"div">, "ref"> &
  VariantProps<typeof panelVariants> & { as?: ElementType };

export function Panel({
  as,
  className,
  variant,
  ticks,
  padding,
  ...props
}: PanelProps) {
  const Comp: ElementType = as ?? "div";
  return (
    <Comp
      className={cn(panelVariants({ variant, ticks, padding }), className)}
      {...(variant === "inverse" ? { "data-tone": "invert" } : {})}
      {...props}
    />
  );
}
