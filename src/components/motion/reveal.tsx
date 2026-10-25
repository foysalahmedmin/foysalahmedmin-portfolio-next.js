import {
  normalizeRevealDelay,
  revealStagger,
  type RevealVariant,
} from "@/lib/motion/reveal";
import { cn } from "@/lib/utils";
import type { ComponentProps, CSSProperties, ElementType } from "react";

type RevealProps = Omit<ComponentProps<"div">, "ref"> & {
  as?:
    | "div"
    | "section"
    | "article"
    | "header"
    | "footer"
    | "figure"
    | "ul"
    | "ol"
    | "li"
    | "p"
    | "span";
  variant?: RevealVariant;
  /** Extra delay in ms, on top of the stagger. */
  delay?: number;
  /** Position within a group; adds the capped stagger step (60 to 90 ms, 600 ms in total). */
  index?: number;
  /** Size of the group, so the whole group fits the stagger budget. */
  count?: number;
  repeat?: boolean;
};

/**
 * A block that rises into place as it enters the view (M07, wipe for media M08).
 *
 * It is a server component with no state: the markup is complete and visible in the HTML, and the
 * start pose only exists after JavaScript has marked a below-the-fold block as ready (see
 * AnimationApplier), so nothing is hidden before JavaScript and the first screen never replays.
 */
export default function Reveal({
  as = "div",
  variant = "up",
  delay = 0,
  index,
  count,
  repeat = false,
  className,
  style,
  ...props
}: RevealProps) {
  const Tag = as as ElementType;
  const total = normalizeRevealDelay(
    delay + (index === undefined ? 0 : revealStagger(index, count))
  );

  return (
    <Tag
      data-reveal={variant}
      data-reveal-repeat={repeat || undefined}
      className={cn(className)}
      style={
        {
          ...style,
          "--reveal-delay": `${total}ms`,
        } as CSSProperties
      }
      {...props}
    />
  );
}
