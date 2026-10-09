import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/** A Mono eyebrow or system-path label (`/triage`, `/case-files`). Narrow, uppercase, tracked. */
export function MonoLabel({ className, ...props }: ComponentProps<"span">) {
  return <span className={cn("t-eyebrow", className)} {...props} />;
}
