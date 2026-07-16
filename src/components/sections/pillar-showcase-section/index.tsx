import type { TPublicSitePillarDto } from "@/app/api/site/site.type";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import { cn } from "@/lib/utils";

const PILLAR_ACCENT_CLASSES: Record<string, string> = {
  brand: "border-[hsl(var(--accent-brand)/0.6)] bg-[hsl(var(--accent-brand)/0.06)]",
  cyan: "border-[hsl(var(--accent-cyan)/0.6)] bg-[hsl(var(--accent-cyan)/0.06)]",
  emerald:
    "border-[hsl(var(--accent-emerald)/0.6)] bg-[hsl(var(--accent-emerald)/0.06)]",
  violet:
    "border-[hsl(var(--accent-violet)/0.6)] bg-[hsl(var(--accent-violet)/0.06)]",
  amber:
    "border-[hsl(var(--accent-amber)/0.6)] bg-[hsl(var(--accent-amber)/0.06)]",
};

const PILLAR_LABEL_CLASSES: Record<string, string> = {
  brand: "text-[hsl(var(--accent-brand))]",
  cyan: "text-[hsl(var(--accent-cyan))]",
  emerald: "text-[hsl(var(--accent-emerald))]",
  violet: "text-[hsl(var(--accent-violet))]",
  amber: "text-[hsl(var(--accent-amber))]",
};

export default function PillarShowcaseSection({
  className,
  pillars,
  heading,
}: {
  className?: string;
  pillars: readonly TPublicSitePillarDto[];
  heading?: string;
}) {
  const visible = pillars
    .filter((p) => p.enabled)
    .sort((a, b) => a.order - b.order);

  if (!visible.length) return null;

  return (
    <section
      id="pillar-showcase"
      aria-labelledby="pillar-showcase-heading"
      className={cn("py-[var(--space-section)]", className)}
    >
      <div className="container">
        <SectionTitle className="lg:mb-20">
          <Subtitle>Five disciplines · one engineer</Subtitle>
          <Title id="pillar-showcase-heading">
            {heading || "What I design, build, and ship"}
          </Title>
          <Description>
            Each capability has a distinct job. Together they produce products
            that are usable, secure, maintainable, and ready to operate at
            scale.
          </Description>
        </SectionTitle>

        <ol className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {visible.map((pillar, index) => {
            const accentClass =
              PILLAR_ACCENT_CLASSES[pillar.accent] ??
              PILLAR_ACCENT_CLASSES["brand"];
            const labelClass =
              PILLAR_LABEL_CLASSES[pillar.accent] ??
              PILLAR_LABEL_CLASSES["brand"];
            return (
              <li
                key={pillar.key}
                className={cn(
                  "rounded-[var(--radius-lg-token)] border p-6",
                  "shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,transform]",
                  "duration-[var(--motion-standard)] motion-safe:hover:-translate-y-1",
                  "hover:shadow-[var(--shadow-sm)]",
                  accentClass
                )}
              >
                <span
                  className={cn("type-label font-bold", labelClass)}
                  aria-hidden="true"
                >
                  {String(index + 1).padStart(2, "0")}
                </span>

                <h3 className="mt-4 text-lg leading-tight font-bold">
                  {pillar.label}
                </h3>

                {pillar.client_outcome && (
                  <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
                    {pillar.client_outcome}
                  </p>
                )}

                {pillar.capabilities.length > 0 && (
                  <ul
                    className="mt-5 space-y-1.5"
                    aria-label={`${pillar.label} capabilities`}
                  >
                    {pillar.capabilities.slice(0, 4).map((cap) => (
                      <li
                        key={cap}
                        className="text-muted-foreground flex items-start gap-2 text-xs leading-5"
                      >
                        <span
                          className={cn(
                            "mt-1.5 h-1 w-1 shrink-0 rounded-full bg-current",
                            labelClass
                          )}
                          aria-hidden="true"
                        />
                        {cap}
                      </li>
                    ))}
                  </ul>
                )}

                {pillar.technologies.length > 0 && (
                  <div className="mt-5 flex flex-wrap gap-1.5">
                    {pillar.technologies.slice(0, 5).map((tech) => (
                      <span
                        key={tech}
                        className="border-border text-muted-foreground rounded-md border px-2 py-0.5 text-xs"
                      >
                        {tech}
                      </span>
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
