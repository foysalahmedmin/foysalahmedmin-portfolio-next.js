import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { PublicSiteLink } from "@/components/content/public-site-link";
import OptimizedMedia from "@/components/ui/optimized-media";
import { getPrimaryPublicCta } from "@/lib/site/public-shell";
import { resolveMediaAlt } from "@/lib/media/presentation";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { ArrowRight, Layers3 } from "lucide-react";
import Link from "next/link";

const AboutDetailsSection = ({ site }: { site: TPublicSiteDto }) => {
  const profile = site.brand.profile ?? site.fallbacks.profile;
  const cta = getPrimaryPublicCta(site);
  const pillarsByKey = new Map(
    site.pillars
      .filter((pillar) => pillar.enabled)
      .map((pillar) => [pillar.key, pillar])
  );
  const enabledPillars = PILLAR_KEYS.flatMap((key) => {
    const pillar = pillarsByKey.get(key);
    return pillar ? [pillar] : [];
  });
  const operatingPrinciples = site.process
    .filter((step) => step.enabled)
    .slice(0, 3);

  return (
    <section
      className="py-[var(--space-section)]"
      aria-labelledby="about-practice-title"
    >
      <div className="container mx-auto px-6">
        <div className="grid items-center gap-16 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="relative">
            <div className="border-border bg-surface-subtle relative aspect-[4/5] overflow-hidden rounded-[2rem] border shadow-[var(--shadow-lg)]">
              <OptimizedMedia
                src={profile?.url}
                alt={resolveMediaAlt(
                  profile,
                  "Abstract portfolio identity visual"
                )}
                fallback="profile"
                focalPoint={profile?.focal_point}
                dominantColor={profile?.dominant_color}
                blurDataUrl={profile?.blur_data_url}
                className="object-cover"
                sizes="(max-width: 1024px) 100vw, 42vw"
              />
              <div className="from-background/60 absolute inset-0 bg-gradient-to-t via-transparent to-transparent" />
            </div>
            <div className="border-border bg-card absolute -right-4 -bottom-8 max-w-64 rounded-2xl border p-5 shadow-[var(--shadow-md)] sm:right-8">
              <Layers3 className="text-primary size-6" aria-hidden="true" />
              <p className="mt-3 text-sm leading-6 font-semibold">
                {enabledPillars.length} connected engineering disciplines, one
                accountable delivery practice.
              </p>
            </div>
          </div>

          <div>
            <p className="text-primary text-sm font-black tracking-[0.18em] uppercase">
              Working philosophy
            </p>
            <h2
              id="about-practice-title"
              className="mt-4 text-3xl font-black tracking-tight text-balance sm:text-4xl lg:text-5xl"
            >
              {site.positioning.long ||
                site.positioning.compact ||
                "A connected product engineering practice"}
            </h2>
            <p className="text-muted-foreground mt-6 text-lg leading-8">
              {site.positioning.long_bio ||
                site.positioning.short_bio ||
                "Published practice details are being prepared."}
            </p>
            {site.positioning.client_promise && (
              <blockquote className="border-primary bg-primary/5 mt-7 rounded-r-2xl border-l-2 p-5 text-base leading-7 font-semibold">
                {site.positioning.client_promise}
              </blockquote>
            )}

            <ol
              className="mt-8 grid gap-3 sm:grid-cols-2"
              aria-label="Engineering disciplines"
            >
              {enabledPillars.map((pillar, index) => (
                <li
                  key={pillar.key}
                  className="border-border bg-card flex min-h-14 items-center gap-3 rounded-xl border px-4 text-sm font-bold"
                >
                  <span className="text-primary text-xs tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  {pillar.label}
                </li>
              ))}
            </ol>

            {operatingPrinciples.length > 0 && (
              <section
                className="border-border bg-surface-subtle mt-8 rounded-[var(--radius-xl-token)] border p-5"
                aria-labelledby="about-operating-principles-title"
              >
                <p className="type-label text-primary">Operating principles</p>
                <h3
                  id="about-operating-principles-title"
                  className="mt-3 text-xl font-black"
                >
                  Process is part of the professional evidence, not a generic
                  promise.
                </h3>
                <ol className="mt-5 grid gap-3">
                  {operatingPrinciples.map((step, index) => (
                    <li
                      key={step.key}
                      className="border-border bg-card rounded-2xl border p-4"
                    >
                      <span className="text-primary text-xs font-black tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <h4 className="mt-2 text-sm font-black">{step.title}</h4>
                      {step.summary && (
                        <p className="text-muted-foreground mt-2 text-xs leading-5">
                          {step.summary}
                        </p>
                      )}
                      {step.deliverable && (
                        <p className="border-l-primary/50 text-muted-foreground mt-3 border-l-2 pl-3 text-xs leading-5">
                          <span className="text-foreground font-black">
                            Evidence output:{" "}
                          </span>
                          {step.deliverable}
                        </p>
                      )}
                    </li>
                  ))}
                </ol>
              </section>
            )}

            <div className="mt-9 flex flex-wrap gap-3">
              {cta && (
                <PublicSiteLink
                  link={cta}
                  showIcon
                  className="bg-primary text-primary-foreground focus-visible:ring-ring inline-flex min-h-12 items-center gap-2 rounded-xl px-6 text-sm font-black focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                />
              )}
              <Link
                href="/projects"
                className="border-border bg-card hover:border-primary focus-visible:ring-primary inline-flex min-h-12 items-center gap-2 rounded-xl border px-6 text-sm font-black focus-visible:ring-2 focus-visible:outline-none"
              >
                Explore the work
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AboutDetailsSection;
