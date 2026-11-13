import { StatusMark, type StatusMarkState } from "@/components/ui/status-mark";
import { cn } from "@/lib/utils";
import type { ComponentProps, ReactNode } from "react";

export type WorkspaceNoticeTone = "success" | "warning" | "error";

const MARK: Record<
  WorkspaceNoticeTone,
  { state: StatusMarkState; label: string }
> = {
  success: { state: "success", label: "Done" },
  warning: { state: "warning", label: "Attention" },
  error: { state: "error", label: "Error" },
};

/**
 * The operation report of the media, project-resource and repeatable workspaces: a state mark with its word, then the
 * message, then an optional action (dismiss) and detail list (failed ids). Errors are announced (`alert`), the rest are `status`.
 */
export function WorkspaceNotice({
  tone,
  action,
  details,
  className,
  children,
  ...props
}: Omit<ComponentProps<"div">, "children"> & {
  tone: WorkspaceNoticeTone;
  action?: ReactNode;
  details?: ReactNode;
  children: ReactNode;
}) {
  const mark = MARK[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      data-notice={tone}
      className={cn("cwd-notice", className)}
      {...props}
    >
      <StatusMark state={mark.state}>{mark.label}</StatusMark>
      <div className="cwd-notice__body">{children}</div>
      {action ? <div className="cwd-notice__action">{action}</div> : null}
      {details}
    </div>
  );
}
