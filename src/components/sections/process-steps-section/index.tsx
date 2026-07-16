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
}: {
  className?: string;
  steps: readonly TSiteProcessStep[];
  heading?: string;
}) {
  const visible = steps.filter((s) => s.enabled);

  if (!visible.length) return null;

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
                  "text-primary/20 font-display select-none text-6xl font-bold leading-none",
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
