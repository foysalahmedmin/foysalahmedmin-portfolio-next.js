import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/** A one-pixel structural rule. Decorative by default; pass role="separator" when it divides content. */
export function Hairline({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden={props.role === "separator" ? undefined : true}
      className={cn("border-line-2 h-px w-full border-t", className)}
      {...props}
    />
  );
}
