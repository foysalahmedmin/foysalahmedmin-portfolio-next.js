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
    (metric) =>
      metric.enabled &&
      metric.value &&
      (metric.verification === "derived" || metric.verification === "verified")
  );

  if (!visible.length) return null;

  return (
    <section
      id="proof-metrics"
      aria-labelledby="proof-metrics-heading"
      className={cn(
        "border-border bg-surface-subtle/70 border-y py-10",
        className
      )}
    >
      <div className="container grid gap-8 lg:grid-cols-[minmax(16rem,0.7fr)_minmax(0,1.3fr)] lg:items-center">
        <div>
          <p className="type-label text-primary">Proof signals</p>
          <h2
            id="proof-metrics-heading"
            className="mt-3 max-w-xl text-2xl leading-tight font-black"
          >
            {heading || "Only derived or verified signals appear publicly."}
          </h2>
          <p className="text-muted-foreground mt-3 max-w-xl text-sm leading-7">
            The homepage does not inflate client proof. Unverified metrics stay
            hidden until their source is reviewed.
          </p>
        </div>

        <dl
          className={cn(
            "grid gap-3",
            visible.length <= 3
              ? "sm:grid-cols-3"
              : visible.length === 4
                ? "sm:grid-cols-2 xl:grid-cols-4"
                : "sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5"
          )}
        >
          {visible.map((metric) => (
            <div
              key={metric.key}
              className="border-border bg-background/75 rounded-2xl border p-5 shadow-[var(--shadow-xs)]"
            >
              <dt className="text-muted-foreground text-xs tracking-wider uppercase">
                {metric.label}
              </dt>
              <dd className="text-primary font-display mt-3 text-4xl leading-none font-bold tracking-tight">
                {metric.value}
              </dd>
              <span className="text-muted-foreground mt-4 inline-flex text-[0.65rem] font-black tracking-widest uppercase">
                {metric.verification === "verified" ? "✓ verified" : "derived"}
              </span>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
