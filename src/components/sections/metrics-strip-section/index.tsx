import type { TSiteMetric } from "@/app/api/site/site.type";
import Reveal from "@/components/motion/reveal";
import { StatusMark } from "@/components/ui/status-mark";
import { TextLink } from "@/components/ui/text-link";
import { cn } from "@/lib/utils";
import type { CSSProperties } from "react";

const EVIDENCE_MIN_CELLS = 3;
const EVIDENCE_MAX_CELLS = 4;

/** What the two marks mean, stated in general terms; no measurement detail is invented per metric. */
const MEASURED_NOTE = {
  derived:
    "Derived from code: the value is read or counted from code and content, not estimated. It is re-derived at each release.",
  verified:
    "Verified: the value was checked against a reviewed source before it was published.",
} as const;

const AS_OF_FORMAT = new Intl.DateTimeFormat("en", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "UTC",
});

const formatAsOf = (value?: string) => {
  const date = value ? new Date(`${value}T00:00:00Z`) : undefined;
  return date && !Number.isNaN(date.getTime())
    ? AS_OF_FORMAT.format(date)
    : undefined;
};

const qualifies = (metric: TSiteMetric) =>
  metric.enabled &&
  Boolean(metric.value) &&
  (metric.verification === "derived" || metric.verification === "verified");

/**
 * Chapter 0b, the evidence strip (docs plan 4.1): one hairline-bordered row of at most four cells under
 * the hero. It renders nothing below three qualifying metrics. The number is plain text (the `Counter`
 * would add a client module to the home route); the "how this was measured" note is a native popover,
 * so it needs no JavaScript.
 */
function EvidenceStrip({
  metrics,
  heading,
}: {
  metrics: readonly TSiteMetric[];
  heading?: string;
}) {
  const cells = metrics.filter(qualifies).slice(0, EVIDENCE_MAX_CELLS);
  if (cells.length < EVIDENCE_MIN_CELLS) return null;

  return (
    <section
      id="proof-metrics"
      aria-labelledby="proof-metrics-heading"
      className="evidence-strip"
    >
      <h2 id="proof-metrics-heading" className="sr-only">
        {heading || "Evidence from the code"}
      </h2>
      <div className="container">
        <Reveal as="ul" className="evidence-row" data-cells={cells.length}>
          {cells.map((metric) => {
            const noteId = `evidence-note-${metric.key}`;
            const asOf = formatAsOf(metric.as_of);
            const state =
              metric.verification === "verified" ? "verified" : "derived";
            return (
              <li
                key={metric.key}
                className="evidence-cell"
                style={
                  {
                    "--evidence-anchor": `--evidence-${metric.key}`,
                  } as CSSProperties
                }
              >
                <p className="evidence-value">{metric.value}</p>
                <p className="evidence-label">{metric.label}</p>
                <p className="t-eyebrow text-fg-secondary">
                  <StatusMark state={state}>
                    {state === "verified" ? "Verified" : "Derived from code"}
                  </StatusMark>
                </p>
                <div className="evidence-actions">
                  {metric.source_slug ? (
                    <TextLink
                      variant="quiet"
                      href={`/case-studies/${metric.source_slug}`}
                    >
                      Case file
                      <span className="sr-only"> for {metric.label}</span>
                    </TextLink>
                  ) : null}
                  <button
                    type="button"
                    popoverTarget={noteId}
                    className="evidence-note-button link-draw"
                  >
                    How this was measured
                  </button>
                </div>
                <div
                  id={noteId}
                  popover="auto"
                  className="evidence-note glass-2"
                >
                  <p className="t-eyebrow text-fg-secondary">
                    How this was measured
                  </p>
                  <p className="t-caption">{MEASURED_NOTE[state]}</p>
                  {asOf ? (
                    <p className="t-caption text-fg-secondary">
                      As of <time dateTime={metric.as_of}>{asOf}</time>
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </Reveal>
      </div>
    </section>
  );
}

export default function MetricsStripSection({
  className,
  metrics,
  heading,
  layout,
}: {
  className?: string;
  metrics: readonly TSiteMetric[];
  heading?: string;
  layout?: string;
}) {
  if (layout === "evidence")
    return <EvidenceStrip metrics={metrics} heading={heading} />;

  const visible = metrics.filter(qualifies);

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
              className="border-border bg-background/75 rounded-xl border p-5 shadow-[var(--shadow-xs)]"
            >
              <dt className="text-muted-foreground text-xs tracking-wider uppercase">
                {metric.label}
              </dt>
              <dd className="text-primary font-display mt-3 text-4xl leading-none font-bold tracking-tight">
                {metric.value}
              </dd>
              <dd className="t-eyebrow text-muted-foreground mt-4">
                <StatusMark
                  state={
                    metric.verification === "verified" ? "verified" : "derived"
                  }
                >
                  {metric.verification === "verified"
                    ? "Verified"
                    : "Derived from code"}
                </StatusMark>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
