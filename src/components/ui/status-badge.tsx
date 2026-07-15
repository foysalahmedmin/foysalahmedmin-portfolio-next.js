import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export type TStatusBadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "destructive";

const toneClassNames: Record<TStatusBadgeTone, string> = {
  neutral: "bg-muted text-muted-foreground",
  primary: "bg-primary/10 text-primary",
  success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  warning: "bg-amber-500/10 text-amber-700 dark:text-amber-400",
  info: "bg-sky-500/10 text-sky-700 dark:text-sky-400",
  destructive: "bg-destructive/10 text-destructive",
};

export type StatusBadgeProps = {
  children: ReactNode;
  tone?: TStatusBadgeTone;
  className?: string;
};

export const StatusBadge = ({
  children,
  tone = "neutral",
  className,
}: StatusBadgeProps) => (
  <span
    className={cn(
      "inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wider whitespace-nowrap uppercase",
      toneClassNames[tone],
      className
    )}
  >
    {children}
  </span>
);
