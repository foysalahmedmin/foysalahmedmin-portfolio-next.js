import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import { CaseStudyDiagram } from "@/components/content/case-study-diagram";
import { ProjectGallery } from "@/components/content/project-gallery";
import { RichContentRenderer } from "@/components/content/rich-content-renderer";
import Reveal from "@/components/motion/reveal";
import OptimizedMedia from "@/components/ui/optimized-media";
import { StatusMark } from "@/components/ui/status-mark";
import { Tag } from "@/components/ui/tag";
import {
  parseCaseStudyArchitecture,
  type CaseStudyArchitecture,
} from "@/lib/content/case-study-contract";
import {
  DIAGRAM_KIND_LABELS,
  highlightIdsForFocus,
  outputHighlightIds,
} from "@/lib/content/case-study-diagram-layout";
import { getPillarLabel } from "@/lib/content/pillars";
import { resolveMediaAlt } from "@/lib/media/presentation";
import { resolvePublicContentFallback } from "@/lib/site/public-content-fallback";
import type {
  TCaseStudyListItem,
  TPublicCaseStudy,
} from "@/types/case-study.type";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

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

/** `data-highlights` for a row; an empty list leaves the attribute off so the diagram rests. */
const highlights = (ids: readonly string[]) =>
  ids.length ? { "data-highlights": ids.join(",") } : {};

const Chapter = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) => (
  <section id={id} className="story-chapter" aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`} className="story-chapter__title t-eyebrow">
      {title}
    </h2>
    {children}
  </section>
);

const BlockHead = ({
  id,
  eyebrow,
  title,
}: {
  id: string;
  eyebrow: string;
  title: string;
}) => (
  <header className="story-block__head">
    <p className="t-eyebrow text-fg-secondary">{eyebrow}</p>
    <h2 id={id} className="t-h4">
      {title}
    </h2>
  </header>
);

const Chips = ({ items }: { items: readonly string[] }) => (
  <ul className="story-chips" role="list">
    {items.map((item) => (
      <li key={item}>
        <Tag>{item}</Tag>
      </li>
    ))}
  </ul>
);

/**
 * The decisions that shape the diagram: each step names the components it concerns, and the engine lights
 * them (and the connections that enter or leave them) as the step reaches the middle of the screen.
 */
const Walkthrough = ({
  architecture,
}: {
  architecture: CaseStudyArchitecture;
}) => {
  if (!architecture.steps.length) return null;
  const nodes = new Map(architecture.nodes.map((node) => [node.key, node]));
  return (
    <ol
      className="story-steps"
      role="list"
      aria-label="Walkthrough of the diagram"
    >
      {architecture.steps.map((step, index) => (
        <li
          key={`${step.title}-${index}`}
          className="story-step"
          data-focus-row=""
          {...highlights(highlightIdsForFocus(architecture, step.focus))}
        >
          <h3 className="story-step__title">{step.title}</h3>
          <ul className="story-step__nodes" role="list">
            {step.focus.map((key) => {
              const node = nodes.get(key);
              return node ? (
                <li key={key}>
                  <span className="t-eyebrow text-fg-secondary">
                    {DIAGRAM_KIND_LABELS[node.kind]}
                  </span>
                  <strong>{node.label}</strong>
                  {node.note ? <span>{node.note}</span> : null}
                </li>
              ) : null;
            })}
          </ul>
        </li>
      ))}
    </ol>
  );
};

const CaseStudyDetailsSection = ({
  caseStudy,
  related,
  next,
  fallbacks,
}: {
  caseStudy: TPublicCaseStudy;
  related: readonly TCaseStudyListItem[];
  /** The case file that follows this one, when the page found one. */
  next?: TCaseStudyListItem | null;
  fallbacks?: TPublicSiteFallbacksDto;
}) => {
  // Fail closed: a diagram that does not satisfy the contract is not drawn
  const parsed = caseStudy.architecture
    ? parseCaseStudyArchitecture(caseStudy.architecture)
    : null;
  const architecture = parsed?.ok ? parsed.value : null;

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
    (started && ended ? `${started} – ${ended}` : (started ?? ended ?? null));
  const factRows: Array<[string, string | null | undefined]> = [
    ["Client", caseStudy.client_name],
    ["Industry", caseStudy.client_industry],
    ["Location", caseStudy.client_location],
    ["My role", caseStudy.role],
    [
      "Team size",
      caseStudy.team_size
        ? `${caseStudy.team_size} ${caseStudy.team_size === 1 ? "person" : "people"}`
        : null,
    ],
    ["Timeframe", timeframe],
  ];
  const facts = factRows.filter((fact): fact is [string, string] =>
    Boolean(fact[1])
  );

  const constraints = (caseStudy.constraints ?? []).filter((item) =>
    item.trim()
  );
  const decisions = caseStudy.key_decisions ?? [];
  const outcomes = (caseStudy.outcomes ?? []).filter(
    (outcome) => outcome.verification_state !== "unverified"
  );
  const services = caseStudy.services ?? [];
  const tools = caseStudy.tech_stack ?? [];

  const hasProblem = Boolean(
    caseStudy.challenge || caseStudy.overview || facts.length
  );
  const hasArchitecture = Boolean(
    architecture ||
      caseStudy.approach ||
      caseStudy.solution ||
      decisions.length ||
      tools.length
  );
  const hasResult = Boolean(
    caseStudy.results_summary || outcomes.length || services.length
  );
  const chapterCount = [
    hasProblem,
    constraints.length > 0,
    hasArchitecture,
    hasResult,
  ].filter(Boolean).length;

  const hasBody = Boolean(caseStudy.content?.trim() || caseStudy.rich_content);
  const learnings = caseStudy.learnings ?? [];
  const gallery = caseStudy.images ?? [];
  const more = related.filter((item) => item._id !== next?._id);

  return (
    <>
      {chapterCount > 0 ? (
        <section
          className="story"
          aria-label="Case file walkthrough"
          data-highlight-scope=""
        >
          <div className="container">
            <div
              className="story-grid"
              data-scroll-focus=""
              data-diagram={architecture ? "true" : "false"}
              style={{ "--story-rows": chapterCount } as CSSProperties}
            >
              {hasProblem ? (
                <Chapter id="problem" title="Problem">
                  <div className="story-row" data-focus-row="">
                    {caseStudy.challenge ? (
                      <p className="story-statement story-prose">
                        {caseStudy.challenge}
                      </p>
                    ) : null}
                    {caseStudy.overview ? (
                      <p className="story-prose text-fg-secondary">
                        {caseStudy.overview}
                      </p>
                    ) : null}
                    {facts.length ? (
                      <dl className="story-facts">
                        {facts.map(([label, value]) => (
                          <div key={label}>
                            <dt className="t-eyebrow text-fg-secondary">
                              {label}
                            </dt>
                            <dd>{value}</dd>
                          </div>
                        ))}
                      </dl>
                    ) : null}
                  </div>
                </Chapter>
              ) : null}

              {constraints.length ? (
                <Chapter id="constraints" title="Constraints">
                  <div className="story-row" data-focus-row="">
                    <ul className="story-list" role="list">
                      {constraints.map((item, index) => (
                        <li key={`${item}-${index}`}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </Chapter>
              ) : null}

              {/* One figure for both layouts: sticky beside the chapters on desktop, inline before Architecture below 1024 px */}
              {architecture ? (
                <CaseStudyDiagram
                  architecture={architecture}
                  className="story-figure"
                />
              ) : null}

              {hasArchitecture ? (
                <Chapter id="architecture" title="Architecture">
                  <div className="story-row" data-focus-row="">
                    {caseStudy.approach ? (
                      <p className="story-prose">{caseStudy.approach}</p>
                    ) : architecture ? (
                      <p className="story-prose">{architecture.alt}</p>
                    ) : null}
                    {decisions.length ? (
                      <>
                        <h3 className="story-subtitle t-eyebrow text-fg-secondary">
                          Key decisions
                        </h3>
                        <ul className="story-list" role="list">
                          {decisions.map((decision, index) => (
                            <li key={`${decision}-${index}`}>{decision}</li>
                          ))}
                        </ul>
                      </>
                    ) : null}
                    {caseStudy.solution ? (
                      <>
                        <h3 className="story-subtitle t-eyebrow text-fg-secondary">
                          What I built
                        </h3>
                        <p className="story-prose">{caseStudy.solution}</p>
                      </>
                    ) : null}
                  </div>
                  {architecture ? (
                    <Walkthrough architecture={architecture} />
                  ) : null}
                  {tools.length ? (
                    <div className="story-aside">
                      <h3 className="story-subtitle t-eyebrow text-fg-secondary">
                        Tools used
                      </h3>
                      <Chips items={tools} />
                    </div>
                  ) : null}
                </Chapter>
              ) : null}

              {hasResult ? (
                <Chapter id="result" title="Result">
                  <div
                    className="story-row"
                    data-focus-row=""
                    {...highlights(
                      architecture ? outputHighlightIds(architecture) : []
                    )}
                  >
                    {caseStudy.results_summary ? (
                      <p className="story-statement story-prose">
                        {caseStudy.results_summary}
                      </p>
                    ) : null}
                    {outcomes.length ? (
                      <ul className="story-outcomes" role="list">
                        {outcomes.map((outcome) => (
                          <li key={`${outcome.label}-${outcome.value}`}>
                            <p className="story-outcome__value t-mono">
                              {outcome.value}
                            </p>
                            <div className="story-outcome__body">
                              <p className="story-outcome__label">
                                {outcome.label}
                              </p>
                              {outcome.description ? (
                                <p className="text-fg-secondary">
                                  {outcome.description}
                                </p>
                              ) : null}
                              <StatusMark
                                state={
                                  outcome.verification_state === "verified"
                                    ? "verified"
                                    : "derived"
                                }
                                className="t-eyebrow"
                              >
                                {outcome.verification_state === "verified"
                                  ? "Verified"
                                  : "Derived from approved data"}
                              </StatusMark>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                    {services.length ? (
                      <>
                        <h3 className="story-subtitle t-eyebrow text-fg-secondary">
                          What I delivered
                        </h3>
                        <Chips items={services} />
                      </>
                    ) : null}
                  </div>
                </Chapter>
              ) : null}
            </div>
          </div>
        </section>
      ) : null}

      {cover || hasBody || learnings.length || gallery.length ? (
        <div className="story-record container">
          {cover ? (
            <figure className="story-cover">
              <OptimizedMedia
                src={cover.url}
                alt={resolveMediaAlt(cover, caseStudy.name)}
                fallback="project"
                pillar={caseStudy.primary_pillar}
                focalPoint={cover.focal_point}
                dominantColor={cover.dominant_color}
                blurDataUrl={cover.blur_data_url}
                sizes="(min-width: 1024px) 60rem, 100vw"
                className="object-cover"
              />
            </figure>
          ) : null}

          {hasBody ? (
            <section className="story-block" aria-labelledby="detail-title">
              <BlockHead
                id="detail-title"
                eyebrow="/in-depth"
                title="The full story"
              />
              <div className="story-block__body">
                <RichContentRenderer
                  document={caseStudy.rich_content}
                  legacyHtml={caseStudy.content ?? ""}
                  fallback="project"
                  pillar={caseStudy.primary_pillar}
                />
              </div>
            </section>
          ) : null}

          {learnings.length ? (
            <section className="story-block" aria-labelledby="learnings-title">
              <BlockHead
                id="learnings-title"
                eyebrow="/reflection"
                title="What I would carry forward"
              />
              <div className="story-block__body">
                <ul className="story-list" role="list">
                  {learnings.map((learning, index) => (
                    <li key={`${learning}-${index}`}>{learning}</li>
                  ))}
                </ul>
              </div>
            </section>
          ) : null}

          {gallery.length ? (
            <section className="story-block" aria-labelledby="gallery-title">
              <BlockHead
                id="gallery-title"
                eyebrow="/visual-proof"
                title="Gallery"
              />
              <div className="story-block__body">
                <ProjectGallery
                  images={gallery}
                  projectName={caseStudy.name}
                  pillar={caseStudy.primary_pillar}
                />
              </div>
            </section>
          ) : null}
        </div>
      ) : null}

      {next ? (
        <section className="story-next" aria-labelledby="story-next-title">
          <Reveal className="container">
            <h2 id="story-next-title" className="t-eyebrow text-fg-secondary">
              Next case file
            </h2>
            <Link
              href={`/case-studies/${next.slug ?? next._id}`}
              className="story-next__link"
            >
              <span className="story-next__title t-h3 link-draw">
                {next.name}
              </span>
              <ArrowRight className="story-next__arrow" aria-hidden="true" />
            </Link>
            {next.description ? (
              <p className="t-lead t-measure">{next.description}</p>
            ) : null}
          </Reveal>
        </section>
      ) : null}

      {more.length > 0 ? (
        <section
          className="story-related container"
          aria-labelledby="related-case-studies-title"
        >
          <h2
            id="related-case-studies-title"
            className="t-eyebrow text-fg-secondary"
          >
            More problems solved
          </h2>
          <ul role="list">
            {more.map((item) => (
              <li key={item._id}>
                <Link
                  href={`/case-studies/${item.slug ?? item._id}`}
                  className="story-related__link"
                >
                  <span className="story-related__title link-draw">
                    {item.name}
                  </span>
                  {item.primary_pillar ? (
                    <span className="t-eyebrow text-fg-secondary">
                      {getPillarLabel(item.primary_pillar)}
                    </span>
                  ) : null}
                </Link>
                {item.description ? (
                  <p className="text-fg-secondary">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
};

export default CaseStudyDetailsSection;
