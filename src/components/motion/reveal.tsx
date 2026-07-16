import { normalizeRevealDelay, type RevealVariant } from "@/lib/motion/reveal";
import { cn } from "@/lib/utils";
import type { ComponentProps, CSSProperties } from "react";

type RevealProps = ComponentProps<"div"> & {
  variant?: RevealVariant;
  delay?: number;
  repeat?: boolean;
};

export default function Reveal({
  variant = "up",
  delay = 0,
  repeat = false,
  className,
  style,
  ...props
}: RevealProps) {
  return (
    <div
      data-reveal={variant}
      data-reveal-repeat={repeat || undefined}
      className={cn(className)}
      style={
        {
          ...style,
          "--reveal-delay": `${normalizeRevealDelay(delay)}ms`,
        } as CSSProperties
      }
      {...props}
    />
  );
}
