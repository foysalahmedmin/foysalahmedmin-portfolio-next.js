import { cn } from "@/lib/utils";
import type { ComponentProps } from "react";

/** Eight-pixel L-marks on two opposite corners, used on featured panels instead of large radii. */
export function CornerTicks({ className, ...props }: ComponentProps<"div">) {
  return <div className={cn("ticks", className)} {...props} />;
}
