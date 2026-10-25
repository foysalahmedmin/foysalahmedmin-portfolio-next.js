import type { TSiteProcessStep } from "@/app/api/site/site.type";
import { Rail } from "@/components/sections/signal/rail";
import { SectionHead } from "@/components/sections/signal/section-head";
import { stripLeadingNumber } from "@/lib/text/strip-number";
import { cn } from "@/lib/utils";

/**
 * "How I work" as a row of cards you move through with the standard arrows. The steps are in order in
 * the HTML and carry no numbers; the order is the row's own.
 */
export default function ProcessStepsSection({
  className,
  steps,
  heading,
}: {
  className?: string;
  steps: readonly TSiteProcessStep[];
  heading?: string;
  layout?: string;
}) {
  const visible = steps.filter((step) => step.enabled);
  if (!visible.length) return null;

  return (
    <section
      id="working-process"
      aria-labelledby="process-heading"
      className={cn("bg-surface-subtle py-[var(--space-section)]", className)}
    >
      <div className="container">
        <Rail
          label="Working process steps"
          head={
            <SectionHead
              eyebrow="How I work"
              title={heading || "A deliberate path from problem to production"}
              titleId="process-heading"
              lead="A project should feel calm because the risk has somewhere to go: discovery, decisions, implementation, verification and handoff each leave something you can see."
            />
          }
        >
          {visible.map((step) => (
            <li key={step.key} className="rail-card">
              <h3 className="t-h4">{stripLeadingNumber(step.title)}</h3>
              {step.summary && (
                <p className="text-fg-secondary text-sm leading-7">
                  {step.summary}
                </p>
              )}
              {step.deliverable && (
                <p className="rail-card-output">
                  <strong>You get</strong>
                  {step.deliverable}
                </p>
              )}
            </li>
          ))}
        </Rail>
      </div>
    </section>
  );
}
