import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { StatusMark, type StatusMarkState } from "./status-mark";

export type TStatusBadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "info"
  | "destructive";

/*
 * State is a shape plus a visible label, never a colour (docs plan 4.3): neutral = outlined square,
 * primary = filled square, info = half-filled square, success = square with a check, warning = outlined
 * diamond with a heavier label, destructive = filled triangle with an inverted label (console-patterns.css).
 */
const markByTone: Record<TStatusBadgeTone, StatusMarkState> = {
  neutral: "draft",
  primary: "published",
  info: "pending",
  success: "success",
  warning: "warning",
  destructive: "error",
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
  // data-badge-tone, not data-tone: [data-tone] is the ink/paper band attribute and would paint a background
  <StatusMark
    state={markByTone[tone]}
    data-badge-tone={tone}
    className={cn("status-badge", className)}
  >
    {children}
  </StatusMark>
);
