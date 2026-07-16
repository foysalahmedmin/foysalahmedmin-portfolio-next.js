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
}: {
  className?: string;
  pillars: readonly TPublicSitePillarDto[];
  services?: readonly TPublicServiceDto[];
  heading?: string;
}) {
  const visiblePillars = pillars.filter((pillar) => pillar.enabled);
  return (
    <section className={cn("py-[var(--space-section)]", className)}>
      <div className="container">
        <SectionTitle className="lg:mb-20">
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
            "grid gap-5 md:grid-cols-2",
            services.length ? "xl:grid-cols-3" : "xl:grid-cols-5"
          )}
        >
          {(services.length
            ? services.map((service) => ({
                key: service.slug,
                order: service.sequence + 1,
                label: service.title,
                summary: service.outcome || service.summary,
                capabilities: service.capabilities,
                technologies: service.technologies,
                pillar: service.primary_pillar,
              }))
            : visiblePillars.map((pillar) => ({
                key: pillar.key,
                order: pillar.order,
                label: pillar.label,
                summary: pillar.client_outcome || pillar.summary,
                capabilities: pillar.capabilities,
                technologies: pillar.technologies,
                pillar: pillar.key,
              }))
          ).map((item) => (
            <li
              key={item.key}
              className="border-border bg-card hover:border-primary/60 rounded-[var(--radius-lg-token)] border p-6 shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,transform] duration-[var(--motion-standard)] hover:shadow-[var(--shadow-sm)] motion-safe:hover:-translate-y-1"
            >
              <span className="text-primary type-label" aria-hidden="true">
                {String(item.order).padStart(2, "0")}
              </span>
              <h3 className="mt-5 text-lg leading-tight font-bold">
                {item.label}
              </h3>
              <p className="text-muted-foreground mt-4 text-sm leading-relaxed">
                {item.summary ||
                  "Published capability details are being prepared."}
              </p>
              {item.capabilities.length > 0 && (
                <ul
                  className="mt-5 space-y-2"
                  aria-label={`${item.label} capabilities`}
                >
                  {item.capabilities.slice(0, 3).map((capability) => (
                    <li
                      key={capability}
                      className="text-muted-foreground text-xs leading-5"
                    >
                      {capability}
                    </li>
                  ))}
                </ul>
              )}
              <div className="text-muted-foreground mt-6 flex flex-wrap gap-2 text-xs">
                {item.pillar && (
                  <span className="bg-muted rounded-md px-2 py-1 font-bold">
                    {getPillarLabel(item.pillar)}
                  </span>
                )}
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
