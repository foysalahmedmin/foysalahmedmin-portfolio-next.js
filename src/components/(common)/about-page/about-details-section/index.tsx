import type { TPublicSiteDto } from "@/app/api/site/site.type";
import { PublicSiteLink } from "@/components/content/public-site-link";
import { SectionHead } from "@/components/sections/signal/section-head";
import { buttonVariants } from "@/components/ui/button-variants";
import OptimizedMedia from "@/components/ui/optimized-media";
import { getHeroArt } from "@/lib/content/fallback-media";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { resolveMediaAlt } from "@/lib/media/presentation";
import { getPrimaryPublicCta } from "@/lib/site/public-shell";
import { stripLeadingNumber } from "@/lib/text/strip-number";
import { cn } from "@/lib/utils";
import { ArrowRight, Layers3 } from "lucide-react";
import Link from "next/link";

/**
 * The practice, as one column that reads top to bottom: what I do and why, a wide picture with the
 * client promise on it, the three areas, and (on the About page) how the work is run. It replaces the
 * old image-beside-text split, where the picture ended up small beside a long column of text.
 * `compact` is the home page's version: the same head, picture and areas, without the process.
 */
const AboutDetailsSection = ({
  site,
  compact = false,
  id,
}: {
  site: TPublicSiteDto;
  compact?: boolean;
  id?: string;
}) => {
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
  const operatingPrinciples = compact
    ? []
    : site.process.filter((step) => step.enabled).slice(0, 3);

  return (
    <section
      {...(id ? { id } : {})}
      className="py-[var(--space-section)]"
      aria-labelledby="about-practice-title"
    >
      <div className="container grid gap-10 lg:gap-14">
        <SectionHead
          align="center"
          eyebrow={compact ? "About the practice" : "Working philosophy"}
          title={
            site.positioning.compact ||
            "A connected product engineering practice"
          }
          titleId="about-practice-title"
          lead={
            compact
              ? site.positioning.short_bio ||
                site.positioning.long_bio ||
                "Published practice details are being prepared."
              : site.positioning.long ||
                site.positioning.long_bio ||
                site.positioning.short_bio ||
                "Published practice details are being prepared."
          }
          className="about-head"
        >
          {!compact && site.positioning.long && site.positioning.long_bio ? (
            <p className="text-fg-secondary mx-auto mt-6 max-w-3xl leading-8">
              {site.positioning.long_bio}
            </p>
          ) : null}
        </SectionHead>

        <figure className="about-banner">
          {site.brand.profile?.url ? (
            <OptimizedMedia
              src={site.brand.profile.url}
              alt={resolveMediaAlt(site.brand.profile, "Portrait")}
              fallback="profile"
              focalPoint={site.brand.profile.focal_point}
              dominantColor={site.brand.profile.dominant_color}
              blurDataUrl={site.brand.profile.blur_data_url}
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1200px"
            />
          ) : (
            // No portrait yet: the three roles' own art, side by side (nothing here is a stand-in photo)
            <div className="about-art" aria-hidden="true">
              {enabledPillars.map((pillar) => (
                <img
                  key={pillar.key}
                  src={getHeroArt(pillar.key).desktop.webp}
                  alt=""
                  width={1600}
                  height={900}
                  loading="lazy"
                  decoding="async"
                  data-mono-media=""
                />
              ))}
            </div>
          )}
          <div className="about-banner-scrim" aria-hidden="true" />
          <figcaption className="about-banner-card">
            <Layers3 className="size-6 shrink-0" aria-hidden="true" />
            <p>
              {site.positioning.client_promise ||
                "Architecture, software and automation, with one accountable owner from first idea to running system."}
            </p>
          </figcaption>
        </figure>

        {enabledPillars.length > 0 && (
          <ul
            className="grid gap-4 md:grid-cols-3"
            role="list"
            aria-label="Practice areas"
          >
            {enabledPillars.map((pillar) => (
              <li key={pillar.key} className="flow-card">
                <h3 className="t-h4">{pillar.label}</h3>
                {(pillar.client_outcome || pillar.summary) && (
                  <p className="text-fg-secondary text-sm leading-7">
                    {pillar.client_outcome || pillar.summary}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}

        {operatingPrinciples.length > 0 && (
          <section aria-labelledby="about-operating-principles-title">
            <div className="mb-6 max-w-2xl">
              <p className="t-eyebrow text-fg-secondary">
                Operating principles
              </p>
              <h3
                id="about-operating-principles-title"
                className="t-h3 about-subtitle mt-3"
              >
                Process is part of the professional evidence, not a generic
                promise.
              </h3>
            </div>
            <ul className="grid gap-4 md:grid-cols-3" role="list">
              {operatingPrinciples.map((step) => (
                <li key={step.key} className="flow-card">
                  <h4 className="font-semibold">
                    {stripLeadingNumber(step.title)}
                  </h4>
                  {step.summary && (
                    <p className="text-fg-secondary text-sm leading-7">
                      {step.summary}
                    </p>
                  )}
                  {step.deliverable && (
                    <p className="rail-card-output">
                      <strong>Evidence output</strong>
                      {step.deliverable}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-wrap justify-center gap-3">
          {cta && (
            <PublicSiteLink
              link={cta}
              showIcon
              className={cn(buttonVariants({ size: "lg" }), "gap-3")}
            />
          )}
          <Link
            href="/projects"
            className={buttonVariants({ size: "lg", variant: "outline" })}
          >
            Explore the work
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default AboutDetailsSection;
