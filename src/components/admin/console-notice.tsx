import { StatusMark, type StatusMarkState } from "@/components/ui/status-mark";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

const MARK: Record<
  "success" | "error" | "warning",
  { state: StatusMarkState; label: string }
> = {
  success: { state: "success", label: "Done" },
  error: { state: "error", label: "Error" },
  warning: { state: "warning", label: "Attention" },
};

/**
 * A hairline notice for the admin workspaces (Phase 8): a state mark with its word, then the message, then an
 * optional action. State is the mark's shape and label, never a tinted box (errors get a dashed frame in CSS).
 */
export function ConsoleNotice({
  kind,
  action,
  className,
  children,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  kind: keyof typeof MARK;
  action?: ReactNode;
  children: ReactNode;
}) {
  const mark = MARK[kind];
  return (
    <div
      role={kind === "success" ? "status" : "alert"}
      data-kind={kind}
      className={cn("cwc-note", className)}
      {...props}
    >
      <StatusMark state={mark.state}>{mark.label}</StatusMark>
      <p className="cwc-note__text">{children}</p>
      {action}
    </div>
  );
}
