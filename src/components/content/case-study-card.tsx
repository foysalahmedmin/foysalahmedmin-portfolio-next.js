import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import OptimizedMedia from "@/components/ui/optimized-media";
import { getPillarLabel } from "@/lib/content/pillars";
import { resolveMediaAlt } from "@/lib/media/presentation";
import { resolvePublicContentFallback } from "@/lib/site/public-content-fallback";
import { cn } from "@/lib/utils";
import type { TCaseStudyListItem } from "@/types/case-study.type";
import { ArrowRight, Clock3, Factory, TrendingUp } from "lucide-react";
import Link from "next/link";

type TCaseStudyCardProps = Readonly<{
  caseStudy: TCaseStudyListItem;
  fallbacks?: TPublicSiteFallbacksDto;
  className?: string;
}>;

/** Case studies borrow the managed project fallbacks for their cover. */
export const CaseStudyCard = ({
  caseStudy,
  fallbacks,
  className,
}: TCaseStudyCardProps) => {
  const href = `/case-studies/${caseStudy.slug ?? caseStudy._id}`;
  const managedFallback = fallbacks
    ? resolvePublicContentFallback({
        kind: "project",
        pillar: caseStudy.primary_pillar,
        fallbacks,
      })
    : undefined;
  const cover = caseStudy.thumbnail?.url ? caseStudy.thumbnail : managedFallback;
  const highlight = caseStudy.outcomes?.[0];
  const label = caseStudy.primary_pillar
    ? getPillarLabel(caseStudy.primary_pillar)
    : (caseStudy.category?.name ?? "Case study");

  return (
    <article
      className={cn(
        "group border-border bg-card flex h-full flex-col overflow-hidden rounded-[var(--radius-xl-token)] border shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,transform] duration-[var(--motion-standard)] hover:border-primary/40 hover:shadow-[var(--shadow-md)] motion-safe:hover:-translate-y-1",
        className
      )}
    >
      <Link
        href={href}
        tabIndex={-1}
        aria-hidden="true"
        className="relative block aspect-[16/10] overflow-hidden"
      >
        <OptimizedMedia
          src={cover?.url}
          alt={resolveMediaAlt(cover, `${caseStudy.name} case study visual`)}
          fallback="project"
          pillar={caseStudy.primary_pillar}
          focalPoint={cover?.focal_point}
          dominantColor={cover?.dominant_color}
          blurDataUrl={cover?.blur_data_url}
          sizes="(max-width: 767px) 100vw, (max-width: 1279px) 50vw, 33vw"
          className="h-full w-full object-cover transition-transform duration-[var(--motion-slow)] motion-safe:group-hover:scale-[1.03]"
        />
        {caseStudy.is_featured ? (
          <span className="bg-background/90 text-foreground absolute top-4 left-4 rounded-full px-3 py-1 text-xs font-semibold backdrop-blur">
            Featured
          </span>
        ) : null}
      </Link>

      <div className="flex flex-1 flex-col p-6 lg:p-7">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold tracking-wide uppercase">
          <span className="text-primary">{label}</span>
          {caseStudy.category?.name && caseStudy.primary_pillar ? (
            <span className="text-muted-foreground">
              {caseStudy.category.name}
            </span>
          ) : null}
        </div>
        <h3 className="group-hover:text-primary mt-3 text-2xl leading-tight font-bold transition-colors">
          <Link
            href={href}
            className="focus-visible:ring-ring rounded-sm outline-none focus-visible:ring-2"
          >
            {caseStudy.name}
          </Link>
        </h3>
        {caseStudy.description ? (
          <p className="text-muted-foreground mt-3 line-clamp-3 text-sm leading-relaxed">
            {caseStudy.description}
          </p>
        ) : null}

        {highlight ? (
          <p className="bg-primary/10 text-foreground mt-5 flex items-start gap-3 rounded-xl p-3 text-sm">
            <TrendingUp
              className="text-primary mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
            <span>
              <strong className="font-black">{highlight.value}</strong>{" "}
              <span className="text-muted-foreground">{highlight.label}</span>
            </span>
          </p>
        ) : null}

        <dl className="text-muted-foreground mt-5 flex flex-wrap gap-x-4 gap-y-2 text-xs">
          {caseStudy.client_industry ? (
            <div className="inline-flex items-center gap-1.5">
              <Factory className="size-3.5" aria-hidden="true" />
              <dt className="sr-only">Industry</dt>
              <dd>{caseStudy.client_industry}</dd>
            </div>
          ) : null}
          {caseStudy.duration_label ? (
            <div className="inline-flex items-center gap-1.5">
              <Clock3 className="size-3.5" aria-hidden="true" />
              <dt className="sr-only">Duration</dt>
              <dd>{caseStudy.duration_label}</dd>
            </div>
          ) : null}
        </dl>

        {caseStudy.tech_stack?.length ? (
          <ul className="mt-5 flex flex-wrap gap-2" aria-label="Tools used">
            {caseStudy.tech_stack.slice(0, 4).map((tool) => (
              <li
                key={tool}
                className="bg-muted text-muted-foreground rounded-full px-2.5 py-1 text-xs"
              >
                {tool}
              </li>
            ))}
          </ul>
        ) : null}

        <Link
          href={href}
          aria-label={`Read the ${caseStudy.name} case study`}
          className="text-primary focus-visible:ring-ring mt-auto inline-flex min-h-11 items-center gap-2 self-start pt-6 text-sm font-black tracking-widest uppercase outline-none focus-visible:ring-2"
        >
          Read case study
          <ArrowRight
            className="size-4 transition-transform motion-safe:group-hover:translate-x-1"
            aria-hidden="true"
          />
        </Link>
      </div>
    </article>
  );
};
