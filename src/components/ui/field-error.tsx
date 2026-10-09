import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";
import type { ComponentProps } from "react";

/**
 * The shared field error (docs plan 3.6): glyph, a heavy "Error:" label, then what failed and how to
 * fix it. Colour is never the only signal. Wire it to the control with `aria-describedby`.
 */
export function FieldError({
  className,
  children,
  ...props
}: ComponentProps<"p">) {
  return (
    <p
      className={cn(
        "text-destructive flex items-start gap-2 text-sm leading-6",
        className
      )}
      {...props}
    >
      <AlertTriangle className="mt-1 size-4 shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-bold">Error:</strong> {children}
      </span>
    </p>
  );
}
