import { cn } from "@/lib/utils";
import { AlertTriangle, Inbox, RefreshCw, WifiOff } from "lucide-react";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "./button";

type StateShellProps = ComponentProps<"section"> & {
  icon: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
};

function StateShell({
  icon,
  title,
  description,
  action,
  className,
  ...props
}: StateShellProps) {
  return (
    <section
      className={cn(
        "border-border bg-surface-subtle flex min-h-56 flex-col items-center justify-center rounded-[var(--radius-xl-token)] border p-8 text-center",
        className
      )}
      {...props}
    >
      <span className="bg-background text-muted-foreground mb-5 flex size-12 items-center justify-center rounded-full shadow-[var(--shadow-xs)]">
        {icon}
      </span>
      <h2 className="text-lg font-bold">{title}</h2>
      {description ? (
        <p className="text-muted-foreground mt-2 max-w-md text-sm">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </section>
  );
}

type EmptyStateProps = Omit<StateShellProps, "icon"> & { icon?: ReactNode };

export function EmptyState({
  icon = <Inbox className="size-5" aria-hidden="true" />,
  ...props
}: EmptyStateProps) {
  return <StateShell icon={icon} {...props} />;
}

type RetryStateProps = Omit<StateShellProps, "icon" | "action"> & {
  onRetry: () => void;
  retryLabel?: string;
  pending?: boolean;
};

export function ErrorState({
  onRetry,
  retryLabel = "Try again",
  pending = false,
  ...props
}: RetryStateProps) {
  return (
    <StateShell
      role="alert"
      icon={<AlertTriangle className="size-5" aria-hidden="true" />}
      action={
        <Button type="button" onClick={onRetry} isLoading={pending}>
          <RefreshCw className="size-4" aria-hidden="true" />
          {pending ? "Retrying…" : retryLabel}
        </Button>
      }
      {...props}
    />
  );
}

export function StaleState({
  onRetry,
  retryLabel = "Refresh",
  pending = false,
  ...props
}: RetryStateProps) {
  return (
    <StateShell
      role="status"
      icon={<WifiOff className="size-5" aria-hidden="true" />}
      action={
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          isLoading={pending}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          {pending ? "Refreshing…" : retryLabel}
        </Button>
      }
      {...props}
    />
  );
}

export const RetryState = ErrorState;

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "bg-muted rounded-[var(--radius-sm-token)] motion-safe:animate-pulse",
        className
      )}
      {...props}
    />
  );
}
