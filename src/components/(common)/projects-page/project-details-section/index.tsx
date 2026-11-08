import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import { ProjectGallery } from "@/components/content/project-gallery";
import { RichContentRenderer } from "@/components/content/rich-content-renderer";
import OptimizedMedia from "@/components/ui/optimized-media";
import { StatusMark } from "@/components/ui/status-mark";
import { TextLink } from "@/components/ui/text-link";
import { getPillarLabel } from "@/lib/content/pillars";
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";
import { resolveMediaAlt } from "@/lib/media/presentation";
import { resolvePublicContentFallback } from "@/lib/site/public-content-fallback";
import type { TProject, TProjectListItem } from "@/types/project.type";
import type { ReactNode } from "react";
import { projectYear, titleCase } from "../format";

export type TPublicProjectResource = Readonly<{
  _id?: string;
  title: string;
  url: string;
  type: "repository" | "design" | "documentation" | "other";
  description?: string;
  sequence?: number;
}>;

/** The live and source links that are safe to show publicly. The page puts them in the header actions. */
export const getPublicProjectLinks = (
  project: Pick<TProject, "live_url" | "source_url">
) =>
  [
    project.live_url && isAllowedPublicProjectUrl(project.live_url)
      ? { label: "Open live product", href: project.live_url }
      : null,
    project.source_url && isAllowedPublicProjectUrl(project.source_url)
      ? { label: "View public source", href: project.source_url }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));

const Paragraphs = ({ text }: { text: string }) => (
  <p className="lab-prose">{text}</p>
);

/** A case-file section: one H2 in the four-word vocabulary (Problem, Approach, Result), body below it. */
const Section = ({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) => (
  <section id={id} aria-labelledby={`${id}-title`} className="lab-section">
    <h2 id={`${id}-title`} className="lab-section__title t-h4">
      {title}
    </h2>
    {children}
  </section>
);

const SubHead = ({ children }: { children: ReactNode }) => (
  <h3 className="lab-subhead t-eyebrow text-fg-secondary">{children}</h3>
);

const Fact = ({ label, children }: { label: string; children: ReactNode }) => (
  <div className="lab-fact">
    <dt className="t-eyebrow text-fg-secondary">{label}</dt>
    <dd>{children}</dd>
  </div>
);

/**
 * `/projects/[id]` body (docs plan 4.2, archetype A4): a 46 rem reading column and a sticky facts aside.
 * The template gives the page header (title, lede, path, live and source actions) and the CtaBand, so this
 * renders neither. The sections use the case-file vocabulary where the data allows: Problem, Approach,
 * Result, and the Stack in the facts.
 */
const ProjectDetailsSection = ({
  project,
  resources,
  related,
  fallbacks,
}: {
  project: TProject;
  resources: readonly TPublicProjectResource[];
  related: readonly TProjectListItem[];
  fallbacks?: TPublicSiteFallbacksDto;
}) => {
  const pillar = project.primary_pillar
    ? getPillarLabel(project.primary_pillar)
    : null;
  const safeResources = resources.filter((resource) =>
    isAllowedPublicProjectUrl(resource.url)
  );
  const managedFallback = fallbacks
    ? resolvePublicContentFallback({
        kind: "project",
        pillar: project.primary_pillar,
        fallbacks,
      })
    : undefined;
  const cover = project.thumbnail?.url ? project.thumbnail : managedFallback;
  const started = projectYear(project.started_at);
  const ended = projectYear(project.ended_at);
  const period =
    started && ended && ended !== started
      ? `${started}–${ended}`
      : (started ?? ended);
  const hasBody = Boolean(project.content?.trim() || project.rich_content);
  const constraints = project.constraints ?? [];
  const decisions = project.decisions ?? [];
  const outcomes = project.outcomes ?? [];
  const learnings = project.learnings ?? [];
  const stack = project.tags ?? [];
  const hasProblem = Boolean(project.problem) || constraints.length > 0;
  const hasApproach =
    Boolean(project.architecture || project.implementation) ||
    decisions.length > 0;
  const hasResult =
    outcomes.length > 0 ||
    Boolean(project.security || project.performance_reliability) ||
    learnings.length > 0;

  return (
    <div className="lab-detail-page container">
      <div className="lab-detail">
        <article className="lab-detail__main">
          <figure className="lab-cover">
            <div className="lab-cover__frame">
              <OptimizedMedia
                src={cover?.url}
                alt={resolveMediaAlt(cover, project.name)}
                fallback="project"
                pillar={project.primary_pillar}
                focalPoint={cover?.focal_point}
                dominantColor={cover?.dominant_color}
                blurDataUrl={cover?.blur_data_url}
                sizes="(max-width: 1023px) 100vw, 46rem"
                priority
                className="object-cover"
              />
            </div>
          </figure>

          {hasBody ? (
            <RichContentRenderer
              className="lab-body"
              document={project.rich_content}
              legacyHtml={project.content}
              fallback="project"
              pillar={project.primary_pillar}
            />
          ) : null}

          {hasProblem ? (
            <Section id="problem" title="Problem">
              {project.problem ? <Paragraphs text={project.problem} /> : null}
              {constraints.length ? (
                <>
                  <SubHead>Constraints</SubHead>
                  <ul className="lab-list">
                    {constraints.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </Section>
          ) : null}

          {hasApproach ? (
            <Section id="approach" title="Approach">
              {project.architecture ? (
                <Paragraphs text={project.architecture} />
              ) : null}
              {decisions.length ? (
                <>
                  <SubHead>Decisions</SubHead>
                  <ol className="lab-wire">
                    {decisions.map((decision) => (
                      <li key={decision}>{decision}</li>
                    ))}
                  </ol>
                </>
              ) : null}
              {project.implementation ? (
                <>
                  <SubHead>What I built</SubHead>
                  <Paragraphs text={project.implementation} />
                </>
              ) : null}
            </Section>
          ) : null}

          {hasResult ? (
            <Section id="result" title="Result">
              {outcomes.length ? (
                <dl className="lab-outcomes">
                  {outcomes.map((outcome) => (
                    <div
                      key={`${outcome.label}-${outcome.value}`}
                      className="lab-outcome"
                    >
                      <dt>{outcome.label}</dt>
                      <dd>
                        <strong className="lab-outcome__value t-mono">
                          {outcome.value}
                        </strong>
                        <StatusMark
                          state={
                            outcome.verification_state === "verified"
                              ? "verified"
                              : "derived"
                          }
                          className="t-eyebrow"
                        >
                          {outcome.verification_state === "verified"
                            ? "Evidence verified"
                            : "Derived from approved data"}
                        </StatusMark>
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : null}
              {project.security || project.performance_reliability ? (
                <>
                  <SubHead>Why it holds up</SubHead>
                  <dl className="lab-holds">
                    {project.security ? (
                      <div>
                        <dt>Security boundary</dt>
                        <dd>{project.security}</dd>
                      </div>
                    ) : null}
                    {project.performance_reliability ? (
                      <div>
                        <dt>Performance and reliability</dt>
                        <dd>{project.performance_reliability}</dd>
                      </div>
                    ) : null}
                  </dl>
                </>
              ) : null}
              {learnings.length ? (
                <>
                  <SubHead>Carried forward</SubHead>
                  <ul className="lab-list">
                    {learnings.map((learning) => (
                      <li key={learning}>{learning}</li>
                    ))}
                  </ul>
                </>
              ) : null}
            </Section>
          ) : null}

          {project.images && project.images.length > 0 ? (
            <Section id="gallery" title="Gallery">
              <ProjectGallery
                images={project.images}
                projectName={project.name}
                pillar={project.primary_pillar}
              />
            </Section>
          ) : null}
        </article>

        <aside className="lab-detail__aside">
          <div className="lab-facts">
            <h2 className="lab-facts__title t-eyebrow text-fg-secondary">
              Project facts
            </h2>
            <dl>
              {pillar || project.role ? (
                <Fact label="Role">
                  {pillar ? <span>{pillar}</span> : null}
                  {project.role ? (
                    <span className="lab-fact__sub">{project.role}</span>
                  ) : null}
                </Fact>
              ) : null}
              {project.project_type ? (
                <Fact label="Type">{titleCase(project.project_type)}</Fact>
              ) : null}
              {project.delivery_status ? (
                <Fact label="Status">{titleCase(project.delivery_status)}</Fact>
              ) : null}
              {period ? (
                <Fact label="Year">
                  <span className="t-mono">{period}</span>
                </Fact>
              ) : null}
              {stack.length ? (
                <Fact label="Stack">
                  <ul className="lab-stack">
                    {stack.map((tag) => (
                      <li key={tag} className="t-mono">
                        {tag}
                      </li>
                    ))}
                  </ul>
                </Fact>
              ) : null}
            </dl>
          </div>

          {safeResources.length > 0 ? (
            <div className="lab-facts">
              <h2 className="lab-facts__title t-eyebrow text-fg-secondary">
                Public resources
              </h2>
              <ul className="lab-resources">
                {safeResources.map((resource) => (
                  <li key={resource._id ?? resource.url}>
                    <TextLink href={resource.url} variant="quiet" external>
                      {resource.title}
                    </TextLink>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>
      </div>

      {related.length > 0 ? (
        <section
          aria-labelledby="related-projects-title"
          className="lab-related"
        >
          <h2 id="related-projects-title" className="t-h4">
            Similar problems solved
          </h2>
          <ul className="lab-related__list">
            {related.map((item) => (
              <li key={item._id} className="lab-related__item">
                <p className="t-eyebrow text-fg-secondary">
                  {item.primary_pillar
                    ? getPillarLabel(item.primary_pillar)
                    : "Project"}
                </p>
                <h3 className="lab-related__title">
                  <TextLink
                    href={`/projects/${item.slug ?? item._id}`}
                    variant="quiet"
                  >
                    {item.name}
                  </TextLink>
                </h3>
                {item.description ? (
                  <p className="lab-related__desc">{item.description}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
};

export default ProjectDetailsSection;
