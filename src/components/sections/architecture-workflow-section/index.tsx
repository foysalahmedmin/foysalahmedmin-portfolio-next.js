import type { TPublicSiteDto } from "@/app/api/site/site.type";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { cn } from "@/lib/utils";

type ArchitectureWorkflowLayout = "default" | "bento" | "compact" | string;

const GUARDRAILS = [
  {
    key: "security",
    title: "Security boundary",
    copy: "DTOs, validation, managed media, and admin capabilities are designed as release blockers—not decoration.",
  },
  {
    key: "accessibility",
    title: "Accessibility boundary",
    copy: "Keyboard, reduced motion, semantic structure, and fallback states are treated as part of the core product surface.",
  },
  {
    key: "operations",
    title: "Operations boundary",
    copy: "Caching, telemetry, migration safety, and failure recovery stay visible while UI polish evolves.",
  },
] as const;

const AUTOMATION_STEPS = [
  "Map the workflow and the human approval point.",
  "Generate bounded drafts, data transforms, or operational assists.",
  "Validate outputs through typed contracts, logs, and review gates.",
  "Ship only the part that remains useful when automation is unavailable.",
] as const;

export default function ArchitectureWorkflowSection({
  site,
  heading,
  layout = "default",
}: {
  site: TPublicSiteDto;
  heading?: string;
  layout?: ArchitectureWorkflowLayout;
}) {
  const pillarsByKey = new Map<
    TPublicSiteDto["pillars"][number]["key"],
    TPublicSiteDto["pillars"][number]
  >();
  for (const pillar of site.pillars) {
    if (pillar.enabled && !pillarsByKey.has(pillar.key)) {
      pillarsByKey.set(pillar.key, pillar);
    }
  }
  const pillars = PILLAR_KEYS.flatMap((key) => {
    const pillar = pillarsByKey.get(key);
    return pillar ? [pillar] : [];
  });
  const processSteps = site.process.filter((step) => step.enabled).slice(0, 4);
  const compact = layout === "compact";

  return (
    <section
      id="architecture-workflow"
      aria-labelledby="architecture-workflow-heading"
      className="relative overflow-hidden py-[var(--space-section)]"
    >
      <div className="container">
        <SectionTitle className="lg:mb-16">
          <Subtitle>Architecture · AI automation · delivery</Subtitle>
          <Title id="architecture-workflow-heading">
            {heading || "A product system, not a stack of disconnected skills"}
          </Title>
          <Description>
            The public experience is intentionally shaped around five connected
            disciplines. The same structure guides implementation: contracts
            first, automation with review, and operational guardrails before
            launch claims.
          </Description>
        </SectionTitle>

        <div
          className={cn(
            "grid gap-5",
            compact
              ? "lg:grid-cols-3"
              : "lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]"
          )}
        >
          <section
            className="border-border bg-card relative overflow-hidden rounded-[var(--radius-xl-token)] border p-6 shadow-[var(--shadow-sm)] lg:p-8"
            aria-labelledby="architecture-system-map-heading"
          >
            <div
              className="bg-primary/10 absolute -top-24 -right-20 size-72 rounded-full blur-[110px]"
              aria-hidden="true"
            />
            <div className="relative">
              <p className="type-label text-primary">System map</p>
              <h3
                id="architecture-system-map-heading"
                className="mt-4 text-2xl leading-tight font-black"
              >
                Five capability lanes feeding one delivery loop.
              </h3>
              <p className="text-muted-foreground mt-4 max-w-2xl text-sm leading-7">
                Frontend, backend, AI automation, system design, and full-stack
                delivery stay connected so performance, data, security, and user
                experience are not solved in separate silos.
              </p>

              <ol
                className="mt-8 grid gap-3 sm:grid-cols-2"
                aria-label="Five-pillar system map in canonical order"
              >
                {pillars.map((pillar, index) => (
                  <li
                    key={pillar.key}
                    className="border-border bg-background/70 rounded-2xl border p-4"
                  >
                    <span className="text-muted-foreground text-xs font-black tracking-[0.16em] uppercase">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <h4 className="mt-2 text-sm font-black">{pillar.label}</h4>
                    <p className="text-muted-foreground mt-2 line-clamp-3 text-xs leading-5">
                      {pillar.summary ||
                        pillar.seo_summary ||
                        "Capability copy is managed through the Site profile."}
                    </p>
                  </li>
                ))}
              </ol>
            </div>
          </section>

          <div className="grid gap-5">
            <section
              className="border-border bg-surface-raised rounded-[var(--radius-xl-token)] border p-6 shadow-[var(--shadow-xs)]"
              aria-labelledby="architecture-ai-lane-heading"
            >
              <p className="type-label text-primary">AI automation lane</p>
              <h3
                id="architecture-ai-lane-heading"
                className="mt-4 text-xl leading-tight font-black"
              >
                Helpful automation stays inside a reviewable system.
              </h3>
              <ol
                className="mt-6 space-y-3"
                aria-label="AI automation workflow with human review boundaries"
              >
                {AUTOMATION_STEPS.map((step, index) => (
                  <li key={step} className="flex gap-3 text-sm leading-6">
                    <span className="bg-primary text-primary-foreground mt-0.5 inline-grid size-6 shrink-0 place-items-center rounded-full text-[0.65rem] font-black">
                      {index + 1}
                    </span>
                    <span className="text-muted-foreground">{step}</span>
                  </li>
                ))}
              </ol>
            </section>

            <section
              className="border-border bg-background rounded-[var(--radius-xl-token)] border p-6 shadow-[var(--shadow-xs)]"
              aria-labelledby="architecture-guardrails-heading"
            >
              <p className="type-label text-primary">Delivery guardrails</p>
              <div id="architecture-guardrails-heading" className="sr-only">
                Delivery guardrails
              </div>
              <div className="mt-5 grid gap-3" role="list">
                {GUARDRAILS.map((guardrail) => (
                  <article
                    key={guardrail.key}
                    className="border-border rounded-2xl border p-4"
                    role="listitem"
                  >
                    <h3 className="text-sm font-black">{guardrail.title}</h3>
                    <p className="text-muted-foreground mt-2 text-xs leading-5">
                      {guardrail.copy}
                    </p>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </div>

        {processSteps.length > 0 && (
          <div className="border-border bg-card/70 mt-5 rounded-[var(--radius-xl-token)] border p-5 shadow-[var(--shadow-xs)]">
            <p className="type-label text-muted-foreground">
              Current delivery sequence
            </p>
            <ol className="mt-4 grid gap-3 md:grid-cols-4">
              {processSteps.map((step, index) => (
                <li key={step.key} className="text-sm leading-6">
                  <span className="text-primary text-xs font-black">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <p className="mt-1 font-bold">{step.title}</p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </section>
  );
}
