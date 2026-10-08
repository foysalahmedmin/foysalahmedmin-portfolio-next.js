import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import { CaseStudyCard } from "@/components/content/case-study-card";
import { ProjectGallery } from "@/components/content/project-gallery";
import { RichContentRenderer } from "@/components/content/rich-content-renderer";
import ParallaxLayer from "@/components/motion/parallax-layer";
import OptimizedMedia from "@/components/ui/optimized-media";
import { CASE_STUDY_ENGAGEMENT_LABELS } from "@/lib/content/case-study-contract";
import { getPillarLabel } from "@/lib/content/pillars";
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";
import { resolveMediaAlt } from "@/lib/media/presentation";
import { resolvePublicContentFallback } from "@/lib/site/public-content-fallback";
import type {
  TCaseStudyListItem,
  TPublicCaseStudy,
} from "@/types/case-study.type";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const DetailSection = ({
  id,
  eyebrow,
  title,
  children,
}: {
  id: string;
  eyebrow: string;
  title: string;
  children: ReactNode;
}) => (
  <section
    id={id}
    className="border-border border-t pt-10"
    aria-labelledby={`${id}-title`}
  >
    <p className="text-primary text-xs font-black tracking-[0.18em] uppercase">
      {eyebrow}
    </p>
    <h2 id={`${id}-title`} className="mt-3 text-3xl font-black tracking-tight">
      {title}
    </h2>
    <div className="text-muted-foreground mt-5 text-base leading-8">
      {children}
    </div>
  </section>
);

const monthFormatter = new Intl.DateTimeFormat("en", {
  month: "short",
  year: "numeric",
  timeZone: "UTC",
});

const formatMonth = (value?: string): string | null => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.valueOf()) ? null : monthFormatter.format(date);
};

const FactRow = ({ label, value }: { label: string; value?: string | null }) =>
  value ? (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-bold">{value}</dd>
    </div>
  ) : null;

const Paragraphs = ({ text }: { text: string }) => (
  <div className="space-y-4 whitespace-pre-line">{text}</div>
);

const CaseStudyDetailsSection = ({
  caseStudy,
  related,
  fallbacks,
}: {
  caseStudy: TPublicCaseStudy;
  related: readonly TCaseStudyListItem[];
  fallbacks?: TPublicSiteFallbacksDto;
}) => {
  const pillar = caseStudy.primary_pillar
    ? getPillarLabel(caseStudy.primary_pillar)
    : null;
  const links = [
    caseStudy.live_url && isAllowedPublicProjectUrl(caseStudy.live_url)
      ? { label: "Open live product", href: caseStudy.live_url }
      : null,
    caseStudy.source_url && isAllowedPublicProjectUrl(caseStudy.source_url)
      ? { label: "View public source", href: caseStudy.source_url }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));
  const managedFallback = fallbacks
    ? resolvePublicContentFallback({
        kind: "project",
        pillar: caseStudy.primary_pillar,
        fallbacks,
      })
    : undefined;
  const cover = caseStudy.thumbnail?.url
    ? caseStudy.thumbnail
    : managedFallback;
  const started = formatMonth(caseStudy.started_at);
  const ended = formatMonth(caseStudy.ended_at);
  const timeframe =
    caseStudy.duration_label ||
    (started && ended
      ? `${started} – ${ended}`
      : (started ?? ended ?? null));
  const hasBody = Boolean(caseStudy.content?.trim() || caseStudy.rich_content);
  // Number only the sections that are actually shown, in reading order.
  let section = 0;
  const nextEyebrow = (label: string) =>
    `${String((section += 1)).padStart(2, "0")} · ${label}`;
  const outcomes = caseStudy.outcomes ?? [];

  return (
    <main className="bg-background min-h-screen">
      <header className="relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-24">
        <div className="bg-primary/10 pointer-events-none absolute top-0 left-1/2 h-[30rem] w-[70rem] -translate-x-1/2 rounded-full blur-[140px]" />
        <div className="relative container mx-auto px-6">
          <Link
            href="/case-studies"
            className="text-muted-foreground hover:text-primary focus-visible:ring-primary inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All case studies
          </Link>
          <div className="mt-10 max-w-5xl">
            <div className="flex flex-wrap gap-2">
              {pillar ? (
                <span className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-xs font-black">
                  {pillar}
                </span>
              ) : null}
              {caseStudy.engagement_type ? (
                <span className="border-border bg-card rounded-full border px-3 py-1.5 text-xs font-bold">
                  {CASE_STUDY_ENGAGEMENT_LABELS[caseStudy.engagement_type]}
                </span>
              ) : null}
              {caseStudy.category?.name ? (
                <span className="border-border bg-card rounded-full border px-3 py-1.5 text-xs font-bold">
                  {caseStudy.category.name}
                </span>
              ) : null}
            </div>
            <h1 className="mt-6 text-5xl leading-[0.95] font-black tracking-tight text-balance sm:text-6xl lg:text-7xl">
              {caseStudy.name}
            </h1>
            {caseStudy.description ? (
              <p className="text-muted-foreground mt-7 max-w-3xl text-xl leading-9">
                {caseStudy.description}
              </p>
            ) : null}
            {links.length > 0 ? (
              <div className="mt-8 flex flex-wrap gap-3">
                {links.map((link) => (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="border-border bg-card hover:border-primary focus-visible:ring-primary inline-flex min-h-12 items-center gap-2 rounded-xl border px-5 text-sm font-black focus-visible:ring-2 focus-visible:outline-none"
                  >
                    {link.label}
                    <ArrowUpRight className="size-4" aria-hidden="true" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6">
        <div className="border-border bg-surface-subtle relative aspect-[16/9] overflow-hidden rounded-[2rem] border shadow-[var(--shadow-lg)] lg:aspect-[21/9]">
          <ParallaxLayer className="absolute -inset-[3%]" depth="subtle">
            <OptimizedMedia
              src={cover?.url}
              alt={resolveMediaAlt(cover, caseStudy.name)}
              fallback="project"
              pillar={caseStudy.primary_pillar}
              focalPoint={cover?.focal_point}
              dominantColor={cover?.dominant_color}
              blurDataUrl={cover?.blur_data_url}
              sizes="100vw"
              priority
              className="object-cover"
            />
          </ParallaxLayer>
        </div>
      </div>

      <article className="container mx-auto grid gap-16 px-6 py-20 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-28">
        <div className="min-w-0 space-y-14">
          {caseStudy.overview ? (
            <section aria-labelledby="overview-title">
              <h2 id="overview-title" className="sr-only">
                Overview
              </h2>
              <div className="text-foreground text-xl leading-9">
                <Paragraphs text={caseStudy.overview} />
              </div>
            </section>
          ) : null}

          {caseStudy.challenge ? (
            <DetailSection
              id="challenge"
              eyebrow={nextEyebrow("The challenge")}
              title="The problem"
            >
              <Paragraphs text={caseStudy.challenge} />
            </DetailSection>
          ) : null}

          {caseStudy.approach || caseStudy.key_decisions?.length ? (
            <DetailSection
              id="approach"
              eyebrow={nextEyebrow("Approach")}
              title="How I approached it"
            >
              {caseStudy.approach ? <Paragraphs text={caseStudy.approach} /> : null}
              {caseStudy.key_decisions?.length ? (
                <ol className="mt-6 space-y-3">
                  {caseStudy.key_decisions.map((decision, index) => (
                    <li key={decision} className="flex gap-3">
                      <span className="text-primary font-black tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{decision}</span>
                    </li>
                  ))}
                </ol>
              ) : null}
            </DetailSection>
          ) : null}

          {caseStudy.solution ? (
            <DetailSection
              id="solution"
              eyebrow={nextEyebrow("Solution")}
              title="What I built"
            >
              <Paragraphs text={caseStudy.solution} />
            </DetailSection>
          ) : null}

          {caseStudy.results_summary || outcomes.length > 0 ? (
            <DetailSection
              id="results"
              eyebrow={nextEyebrow("Impact")}
              title="What changed for the business"
            >
              {caseStudy.results_summary ? (
                <Paragraphs text={caseStudy.results_summary} />
              ) : null}
              {outcomes.length > 0 ? (
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {outcomes.map((outcome) => (
                    <div
                      key={`${outcome.label}-${outcome.value}`}
                      className="border-border bg-card rounded-2xl border p-5"
                    >
                      <CheckCircle2
                        className="text-success size-5"
                        aria-hidden="true"
                      />
                      <p className="text-foreground mt-3 text-lg font-black">
                        {outcome.value}
                      </p>
                      <p className="mt-1 text-sm">{outcome.label}</p>
                      {outcome.description ? (
                        <p className="mt-2 text-sm leading-6">
                          {outcome.description}
                        </p>
                      ) : null}
                      <p className="mt-3 text-[0.65rem] font-black tracking-wide uppercase">
                        {outcome.verification_state === "verified"
                          ? "Evidence verified"
                          : "Derived from approved data"}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}
            </DetailSection>
          ) : null}

          {hasBody ? (
            <DetailSection id="detail" eyebrow={nextEyebrow("In depth")} title="The full story">
              <RichContentRenderer
                document={caseStudy.rich_content}
                legacyHtml={caseStudy.content ?? ""}
                fallback="project"
                pillar={caseStudy.primary_pillar}
              />
            </DetailSection>
          ) : null}

          {caseStudy.learnings?.length ? (
            <DetailSection
              id="learnings"
              eyebrow={nextEyebrow("Reflection")}
              title="What I would carry forward"
            >
              <ul className="space-y-3">
                {caseStudy.learnings.map((learning) => (
                  <li key={learning} className="flex gap-3">
                    <ArrowRight
                      className="text-primary mt-1 size-4 shrink-0"
                      aria-hidden="true"
                    />
                    {learning}
                  </li>
                ))}
              </ul>
            </DetailSection>
          ) : null}

          {caseStudy.images?.length ? (
            <DetailSection
              id="gallery"
              eyebrow={nextEyebrow("Visual proof")}
              title="Gallery"
            >
              <ProjectGallery
                images={caseStudy.images}
                projectName={caseStudy.name}
                pillar={caseStudy.primary_pillar}
              />
            </DetailSection>
          ) : null}
        </div>

        <aside className="h-fit space-y-6 lg:sticky lg:top-28">
          <div className="border-border bg-card rounded-2xl border p-6">
            <h2 className="font-black">Case study facts</h2>
            <dl className="mt-5 space-y-4 text-sm">
              <FactRow label="Client" value={caseStudy.client_name} />
              <FactRow label="Industry" value={caseStudy.client_industry} />
              <FactRow label="Location" value={caseStudy.client_location} />
              <FactRow label="Focus area" value={pillar} />
              <FactRow label="My role" value={caseStudy.role} />
              <FactRow
                label="Team size"
                value={
                  caseStudy.team_size
                    ? `${caseStudy.team_size} ${caseStudy.team_size === 1 ? "person" : "people"}`
                    : null
                }
              />
              <FactRow label="Timeframe" value={timeframe} />
              {caseStudy.tech_stack?.length ? (
                <div>
                  <dt className="text-muted-foreground">Tools used</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {caseStudy.tech_stack.map((tool) => (
                      <span
                        key={tool}
                        className="bg-muted rounded-md px-2 py-1 text-xs font-semibold"
                      >
                        {tool}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
              {caseStudy.services?.length ? (
                <div>
                  <dt className="text-muted-foreground">What I delivered</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {caseStudy.services.map((service) => (
                      <span
                        key={service}
                        className="bg-primary/10 text-primary rounded-md px-2 py-1 text-xs font-semibold"
                      >
                        {service}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}
            </dl>
          </div>
          <div className="bg-primary text-primary-foreground rounded-2xl p-6">
            <h2 className="text-xl font-black">Facing a similar problem?</h2>
            <p className="mt-3 text-sm leading-6 opacity-85">
              Tell me what you are trying to achieve and what is getting in the
              way. I will reply with how I would approach it.
            </p>
            <Link
              href="/contact"
              className="mt-5 inline-flex min-h-11 items-center gap-2 text-sm font-black"
            >
              Start a conversation
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </aside>
      </article>

      {related.length > 0 ? (
        <section
          className="border-border bg-surface-subtle border-t py-20"
          aria-labelledby="related-case-studies-title"
        >
          <div className="container mx-auto px-6">
            <h2
              id="related-case-studies-title"
              className="text-3xl font-black tracking-tight"
            >
              More problems solved
            </h2>
            <ul className="mt-8 grid gap-8 md:grid-cols-3">
              {related.map((item) => (
                <li key={item._id} className="min-w-0">
                  <CaseStudyCard caseStudy={item} fallbacks={fallbacks} />
                </li>
              ))}
            </ul>
          </div>
        </section>
      ) : null}
    </main>
  );
};

export default CaseStudyDetailsSection;
