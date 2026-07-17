import type { TSiteProcessStep } from "@/app/api/site/site.type";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import { cn } from "@/lib/utils";

export default function ProcessStepsSection({
  className,
  steps,
  heading,
  layout = "default",
}: {
  className?: string;
  steps: readonly TSiteProcessStep[];
  heading?: string;
  layout?: string;
}) {
  const visible = steps.filter((s) => s.enabled);

  if (!visible.length) return null;

  const isNumberedJourney = layout === "numbered";

  if (isNumberedJourney) {
    return (
      <section
        id="working-process"
        aria-labelledby="process-heading"
        className={cn("bg-surface-subtle py-[var(--space-section)]", className)}
      >
        <div className="container">
          <div className="grid gap-10 lg:grid-cols-[0.85fr_1.35fr] lg:items-start">
            <div className="lg:sticky lg:top-28">
              <SectionTitle variant="start" className="mb-8">
                <Subtitle>How I work</Subtitle>
                <Title id="process-heading">
                  {heading || "A deliberate path from problem to production"}
                </Title>
                <Description className="mx-0">
                  A project should feel calm because the risk has somewhere to
                  go: discovery, decisions, implementation, verification, and
                  handoff all have visible outputs.
                </Description>
              </SectionTitle>

              <div className="border-border bg-card rounded-[var(--radius-xl-token)] border p-5 shadow-[var(--shadow-xs)]">
                <p className="type-label text-primary">Delivery rhythm</p>
                <ul className="text-muted-foreground mt-4 space-y-3 text-sm leading-6">
                  {[
                    "Decision trail stays visible",
                    "Security and accessibility are checked early",
                    "Launch handoff includes the operating context",
                  ].map((item) => (
                    <li key={item} className="flex gap-3">
                      <span
                        className="bg-primary mt-2 size-1.5 rounded-full"
                        aria-hidden
                      />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <ol
              className="relative space-y-5 before:absolute before:top-5 before:bottom-5 before:left-6 before:w-px before:bg-[var(--border)]"
              aria-label="Working process steps"
            >
              {visible.map((step, index) => (
                <li key={step.key} className="relative flex gap-5">
                  <span className="bg-primary text-primary-foreground ring-surface-subtle z-10 grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-black ring-8">
                    {String(index + 1).padStart(2, "0")}
                  </span>

                  <article className="border-border bg-background flex-1 rounded-[var(--radius-xl-token)] border p-6 shadow-[var(--shadow-xs)]">
                    <h3 className="text-lg leading-snug font-black">
                      {step.title}
                    </h3>

                    {step.summary && (
                      <p className="text-muted-foreground mt-3 text-sm leading-7">
                        {step.summary}
                      </p>
                    )}

                    {step.deliverable && (
                      <p className="border-l-primary/50 text-muted-foreground mt-5 border-l-2 pl-4 text-xs leading-6">
                        <span className="text-foreground font-black">
                          Deliverable:{" "}
                        </span>
                        {step.deliverable}
                      </p>
                    )}
                  </article>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="working-process"
      aria-labelledby="process-heading"
      className={cn("py-[var(--space-section)]", className)}
    >
      <div className="container">
        <SectionTitle className="lg:mb-20">
          <Subtitle>How I work</Subtitle>
          <Title id="process-heading">
            {heading || "A deliberate path from problem to production"}
          </Title>
          <Description>
            Each engagement follows a consistent sequence so nothing critical
            gets discovered late.
          </Description>
        </SectionTitle>

        <ol
          className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-3"
          aria-label="Working process steps"
        >
          {visible.map((step, index) => (
            <li key={step.key} className="relative flex flex-col gap-4">
              {/* Step number */}
              <div
                className={cn(
                  "text-primary/20 font-display text-6xl leading-none font-bold select-none",
                  "transition-colors duration-[var(--motion-standard)]"
                )}
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </div>

              {/* Content */}
              <div className="flex flex-col gap-2">
                <h3 className="text-base leading-snug font-semibold">
                  {step.title}
                </h3>

                {step.summary && (
                  <p className="text-muted-foreground text-sm leading-relaxed">
                    {step.summary}
                  </p>
                )}

                {step.deliverable && (
                  <p className="text-muted-foreground border-l-primary/40 mt-2 border-l-2 pl-3 text-xs leading-relaxed">
                    <span className="font-semibold">Deliverable: </span>
                    {step.deliverable}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
