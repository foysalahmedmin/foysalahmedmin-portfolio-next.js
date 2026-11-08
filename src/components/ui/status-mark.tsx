import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

/**
 * State without colour (docs plan 3.6 and 4.3): a geometric glyph plus a visible text label.
 * The glyph never carries meaning alone, so `children` (the label) is required by the type.
 *
 * Verification states reuse the content-truth vocabulary: `verified` (filled square),
 * `derived` (half-filled square, derived from code) and `unverified` (outlined square).
 */
export type StatusMarkState =
  | "draft"
  | "published"
  | "pending"
  | "warning"
  | "error"
  | "success"
  | "archived"
  | "verified"
  | "derived"
  | "unverified";

const glyphByState: Record<StatusMarkState, string> = {
  draft: "draft",
  published: "published",
  pending: "pending",
  warning: "warning",
  error: "error",
  success: "success",
  archived: "archived",
  verified: "published",
  derived: "pending",
  unverified: "draft",
};

export type StatusMarkProps = Omit<ComponentProps<"span">, "children"> & {
  state: StatusMarkState;
  /** The visible label. Required: the glyph is decoration, the text carries the state. */
  children: ReactNode;
};

export function StatusMark({
  state,
  children,
  className,
  ...props
}: StatusMarkProps) {
  return (
    <span
      {...props}
      className={cn("status-mark", className)}
      data-state={state}
      data-glyph={glyphByState[state]}
    >
      <span className="status-mark__glyph" aria-hidden="true" />
      <span className="status-mark__label">{children}</span>
    </span>
  );
}
