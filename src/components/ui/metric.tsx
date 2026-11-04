import { cn } from "@/lib/utils";

export type MetricProps = {
  value: string;
  label: string;
  /** Where the number comes from (a claim must name its source, docs plan 5.1). */
  source?: string;
  /** Date the figure was last true, shown verbatim. */
  asOf?: string;
  className?: string;
};

export function Metric({ value, label, source, asOf, className }: MetricProps) {
  const provenance = [source, asOf ? `as of ${asOf}` : null]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className={cn("flex min-w-0 flex-col gap-2", className)}>
      <p className="type-metric">{value}</p>
      <p className="t-eyebrow text-fg-secondary">{label}</p>
      {provenance ? (
        <p className="t-caption text-muted-foreground">{provenance}</p>
      ) : null}
    </div>
  );
}
