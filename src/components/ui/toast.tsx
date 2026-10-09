"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Check, Info, X } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Presentational toast (glass tier 3). State is a glyph plus a label, never a colour: success is a
 * check and a solid inverted edge, error is a triangle, a bold "Error:" label and a dashed edge.
 * Wiring (queue, timers, aria-live region) arrives with the console shell in Phase 7.
 */
export type ToastTone = "info" | "success" | "error";

const glyph = {
  info: Info,
  success: Check,
  error: AlertTriangle,
} as const;

const label: Record<ToastTone, string> = {
  info: "Note",
  success: "Done",
  error: "Error",
};

export type ToastProps = {
  tone?: ToastTone;
  title: string;
  children?: ReactNode;
  onDismiss?: () => void;
  className?: string;
};

export function Toast({
  tone = "info",
  title,
  children,
  onDismiss,
  className,
}: ToastProps) {
  const Glyph = glyph[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-tone-kind={tone}
      className={cn(
        "glass-3 text-foreground flex w-full max-w-sm items-start gap-3 rounded-lg p-4",
        tone === "error" ? "border-foreground border border-dashed" : "",
        tone === "success" ? "border-foreground border border-solid" : "",
        className
      )}
    >
      <Glyph className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <strong className="font-bold">{label[tone]}:</strong> {title}
        </p>
        {children ? (
          <p className="text-fg-secondary mt-1 text-sm">{children}</p>
        ) : null}
      </div>
      {onDismiss ? (
        <button
          type="button"
          onClick={onDismiss}
          className="-m-2 grid size-11 shrink-0 place-items-center"
          aria-label="Dismiss notification"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}
