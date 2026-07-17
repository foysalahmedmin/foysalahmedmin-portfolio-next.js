import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import type { TPublicSitePillarDto } from "@/app/api/site/site.type";
import type { TPublicServiceDto } from "@/app/api/services/service.type";
import { getPillarLabel } from "@/lib/content/pillars";
import { cn } from "@/lib/utils";

export default function ServicesSection({
  className,
  pillars,
  services = [],
  heading,
  layout = "grid",
}: {
  className?: string;
  pillars: readonly TPublicSitePillarDto[];
  services?: readonly TPublicServiceDto[];
  heading?: string;
  layout?: string;
}) {
  const visiblePillars = pillars.filter((pillar) => pillar.enabled);
  const useCardsLayout = layout === "cards";
  const items = services.length
    ? services.map((service) => ({
        key: service.slug,
        order: service.sequence + 1,
        label: service.title,
        summary: service.outcome || service.summary,
        capabilities: service.capabilities,
        deliverables: service.deliverables,
        technologies: service.technologies,
        pillar: service.primary_pillar,
      }))
    : visiblePillars.map((pillar) => ({
        key: pillar.key,
        order: pillar.order,
        label: pillar.label,
        summary: pillar.client_outcome || pillar.summary,
        capabilities: pillar.capabilities,
        deliverables: [],
        technologies: pillar.technologies,
        pillar: pillar.key,
      }));

  return (
    <section className={cn("py-[var(--space-section)]", className)}>
      <div className="container">
        <SectionTitle className={cn(useCardsLayout ? "lg:mb-12" : "lg:mb-20")}>
          <Subtitle>Five disciplines, one system</Subtitle>
          <Title>
            {heading || "Product engineering without disconnected hand-offs"}
          </Title>
          <Description>
            Each discipline has a distinct job. Together they create products
            that are usable, secure, maintainable, and ready to operate.
          </Description>
        </SectionTitle>

        <ol
          className={cn(
            "grid gap-5",
            useCardsLayout
              ? "lg:grid-cols-2"
              : services.length
                ? "md:grid-cols-2 xl:grid-cols-3"
                : "md:grid-cols-2 xl:grid-cols-5"
          )}
        >
          {items.map((item) => (
            <li
              key={item.key}
              className={cn(
                "border-border bg-card hover:border-primary/60 rounded-[var(--radius-lg-token)] border p-6 shadow-[var(--shadow-xs)]",
                "transition-[border-color,box-shadow,transform] duration-[var(--motion-standard)] hover:shadow-[var(--shadow-sm)] motion-safe:hover:-translate-y-1",
                useCardsLayout && "lg:p-7"
              )}
            >
              <div className="flex items-start justify-between gap-4">
                <span className="text-primary type-label" aria-hidden="true">
                  {String(item.order).padStart(2, "0")}
                </span>
                {item.pillar && (
                  <span className="bg-muted text-muted-foreground rounded-md px-2 py-1 text-xs font-bold">
                    {getPillarLabel(item.pillar)}
                  </span>
                )}
              </div>
              <h3 className="mt-5 text-xl leading-tight font-black">
                {item.label}
              </h3>
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                {item.summary ||
                  "Published capability details are being prepared."}
              </p>

              <div
                className={cn(
                  "mt-6 grid gap-5",
                  useCardsLayout && "sm:grid-cols-2"
                )}
              >
                {item.capabilities.length > 0 && (
                  <div>
                    <p className="type-label text-muted-foreground">
                      Capability shape
                    </p>
                    <ul
                      className="mt-3 space-y-2"
                      aria-label={`${item.label} capabilities`}
                    >
                      {item.capabilities.slice(0, 4).map((capability) => (
                        <li
                          key={capability}
                          className="text-muted-foreground text-xs leading-5"
                        >
                          {capability}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {item.deliverables.length > 0 && (
                  <div>
                    <p className="type-label text-muted-foreground">
                      Deliverables
                    </p>
                    <ul
                      className="mt-3 space-y-2"
                      aria-label={`${item.label} deliverables`}
                    >
                      {item.deliverables.slice(0, 4).map((deliverable) => (
                        <li
                          key={deliverable}
                          className="text-muted-foreground text-xs leading-5"
                        >
                          {deliverable}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              <div className="text-muted-foreground mt-6 flex flex-wrap gap-2 text-xs">
                {item.technologies.slice(0, 4).map((technology) => (
                  <span
                    key={technology}
                    className="border-border rounded-md border px-2 py-1"
                  >
                    {technology}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
