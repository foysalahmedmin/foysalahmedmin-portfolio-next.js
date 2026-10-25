import type { TPublicSitePillarDto } from "@/app/api/site/site.type";
import { SectionHead } from "@/components/sections/signal/section-head";
import { buttonVariants } from "@/components/ui/button-variants";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { getHeroArt } from "@/lib/content/fallback-media";
import { cn } from "@/lib/utils";
import { ArrowRight, Check } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";

const PillarArt = ({ pillar }: { pillar: TPublicSitePillarDto }) => {
  // A managed visual wins; the generated hero art for the role is the fallback
  if (pillar.visual?.url) {
    return (
      <img
        src={pillar.visual.url}
        alt=""
        loading="lazy"
        decoding="async"
        data-mono-media=""
      />
    );
  }
  const art = getHeroArt(pillar.key);
  return (
    <picture>
      <source
        media="(max-width: 767px)"
        type="image/avif"
        srcSet={art.mobile.avif}
      />
      <source
        media="(max-width: 767px)"
        type="image/webp"
        srcSet={art.mobile.webp}
      />
      <source type="image/avif" srcSet={art.desktop.avif} />
      <img
        src={art.desktop.webp}
        alt=""
        width={art.desktop.width}
        height={art.desktop.height}
        loading="lazy"
        decoding="async"
        data-mono-media=""
      />
    </picture>
  );
};

/**
 * Chapter "practice": the three roles as full-screen panels that slide over each other as you scroll.
 * Each panel is a plain list item with its own art, so without scroll-driven animation (or without
 * JavaScript) they are simply three tall cards. No numbers: the order is the page's own.
 */
export default function PillarShowcaseSection({
  className,
  pillars,
  heading,
}: {
  className?: string;
  pillars: readonly TPublicSitePillarDto[];
  heading?: string;
  layout?: string;
}) {
  const byKey = new Map<TPublicSitePillarDto["key"], TPublicSitePillarDto>();
  for (const pillar of pillars) {
    if (pillar.enabled && !byKey.has(pillar.key)) byKey.set(pillar.key, pillar);
  }
  const visible = PILLAR_KEYS.flatMap((key) => {
    const pillar = byKey.get(key);
    return pillar ? [pillar] : [];
  });

  if (!visible.length) return null;

  return (
    <section
      id="pillar-showcase"
      aria-labelledby="pillar-showcase-heading"
      className={cn("py-[var(--space-section)]", className)}
    >
      <div className="container">
        <SectionHead
          eyebrow="Three roles, one problem-solver"
          title={heading || "Three ways I help you move forward"}
          titleId="pillar-showcase-heading"
          lead="Architecture, software and automation are handled as one connected solution, so the system you plan is the system that gets built and kept running."
          className="mb-10 lg:mb-14"
        />

        <ul className="stack" role="list">
          {visible.map((pillar, index) => (
            <li
              key={pillar.key}
              className="stack-panel"
              style={{ "--i": index } as CSSProperties}
            >
              <div className="stack-media" aria-hidden="true">
                <PillarArt pillar={pillar} />
              </div>
              <div className="stack-scrim" aria-hidden="true" />

              <article
                className="stack-body"
                aria-labelledby={`pillar-${pillar.key}`}
              >
                <div>
                  <h3 id={`pillar-${pillar.key}`} className="t-h2">
                    {pillar.label}
                  </h3>
                  <p className="t-lead text-fg-secondary mt-3">
                    {pillar.client_outcome ||
                      pillar.summary ||
                      pillar.seo_summary ||
                      "Published details for this role are being prepared."}
                  </p>
                </div>

                {pillar.capabilities.length > 0 && (
                  <ul
                    className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2"
                    role="list"
                    aria-label={`${pillar.label} capabilities`}
                  >
                    {pillar.capabilities.slice(0, 4).map((capability) => (
                      <li
                        key={capability}
                        className="flex gap-2.5 text-sm leading-6"
                      >
                        <Check
                          className="mt-1 size-4 shrink-0"
                          aria-hidden="true"
                        />
                        <span>{capability}</span>
                      </li>
                    ))}
                  </ul>
                )}

                {pillar.technologies.length > 0 && (
                  <ul
                    className="stack-chips"
                    role="list"
                    aria-label="Technologies"
                  >
                    {pillar.technologies.slice(0, 6).map((tech) => (
                      <li key={tech} className="chip">
                        {tech}
                      </li>
                    ))}
                  </ul>
                )}

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/projects?pillar=${pillar.key}`}
                    className={buttonVariants({ variant: "default" })}
                  >
                    See projects
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Link>
                  <Link
                    href={`/articles?pillar=${pillar.key}`}
                    className={buttonVariants({ variant: "outline" })}
                  >
                    Read articles
                  </Link>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
