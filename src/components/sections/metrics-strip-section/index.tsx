import type { TSiteMetric } from "@/app/api/site/site.type";
import { cn } from "@/lib/utils";

export default function MetricsStripSection({
  className,
  metrics,
  heading,
}: {
  className?: string;
  metrics: readonly TSiteMetric[];
  heading?: string;
}) {
  const visible = metrics.filter(
    (m) =>
      m.enabled &&
      m.value &&
      (m.verification === "derived" || m.verification === "verified")
  );

  if (!visible.length) return null;

  return (
    <section
      id="proof-metrics"
      aria-label={heading || "Portfolio capability signals"}
      className={cn(
        "border-border border-y bg-[hsl(var(--surface-subtle,var(--muted))/0.4)] py-10",
        className
      )}
    >
      <div className="container">
        {heading && <h2 className="sr-only">{heading}</h2>}
        <dl
          className={cn(
            "grid gap-8",
            visible.length <= 3
              ? "sm:grid-cols-3"
              : visible.length === 4
                ? "sm:grid-cols-2 lg:grid-cols-4"
                : "sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
          )}
        >
          {visible.map((metric) => (
            <div
              key={metric.key}
              className="flex flex-col items-center gap-1 text-center"
            >
              <dt className="text-muted-foreground order-2 text-xs tracking-wider uppercase">
                {metric.label}
              </dt>
              <dd className="text-primary font-display order-1 text-4xl leading-none font-bold tracking-tight">
                {metric.value}
              </dd>
              {metric.verification === "verified" && (
                <span
                  className="text-muted-foreground/60 order-3 text-[10px] tracking-widest uppercase"
                  aria-label="Verified"
                >
                  ✓ verified
                </span>
              )}
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
