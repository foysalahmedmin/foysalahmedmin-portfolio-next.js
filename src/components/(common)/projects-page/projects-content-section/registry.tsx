import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import OptimizedMedia from "@/components/ui/optimized-media";
import { Tag } from "@/components/ui/tag";
import { getPillarLabel } from "@/lib/content/pillars";
import { resolveMediaAlt } from "@/lib/media/presentation";
import { resolvePublicContentFallback } from "@/lib/site/public-content-fallback";
import type { TProjectListItem } from "@/types/project.type";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { formatProjectType, projectYear } from "../format";

const STACK_LIMIT = 4;

/** Labels the stacked (small screen) rows and the column headers. One list, so they cannot drift apart. */
export const REGISTRY_COLUMNS = ["Project", "Role", "Stack", "Type"] as const;

const Empty = () => (
  <>
    <span aria-hidden="true">—</span>
    <span className="sr-only">Not listed</span>
  </>
);

/**
 * One registry row. The preview is a CSS-only enhancement (hover with a fine pointer, or keyboard focus
 * on the name, from 1100 px): everything it could say is already in the row, and the thumbnail stays out
 * of the accessibility tree. On small screens CSS turns the row into a stacked list, labelled from
 * `data-label`; the table markup (and its header associations) is unchanged.
 */
function RegistryRow({
  project,
  fallbacks,
}: {
  project: TProjectListItem;
  fallbacks?: TPublicSiteFallbacksDto | undefined;
}) {
  const href = `/projects/${project.slug ?? project._id}`;
  const role = project.primary_pillar
    ? getPillarLabel(project.primary_pillar)
    : project.category?.name;
  const stack = (project.tags ?? []).slice(0, STACK_LIMIT);
  const year = projectYear(project.started_at);
  const managedFallback = fallbacks
    ? resolvePublicContentFallback({
        kind: "project",
        pillar: project.primary_pillar,
        fallbacks,
      })
    : undefined;
  const cover = project.thumbnail?.url ? project.thumbnail : managedFallback;

  return (
    <tr className="lab-row">
      <th
        scope="row"
        className="lab-row__name"
        data-label={REGISTRY_COLUMNS[0]}
      >
        <Link href={href} className="lab-row__link link-draw">
          {project.name}
        </Link>
        {project.is_featured ? (
          <Tag variant="quiet" className="lab-row__flag">
            Featured
          </Tag>
        ) : null}
        {project.description ? (
          <p className="lab-row__desc">{project.description}</p>
        ) : null}
      </th>
      <td data-label={REGISTRY_COLUMNS[1]}>
        {role ? <span>{role}</span> : <Empty />}
        {project.role ? (
          <span className="lab-row__sub">{project.role}</span>
        ) : null}
      </td>
      <td data-label={REGISTRY_COLUMNS[2]} className="t-mono lab-row__stack">
        {stack.length ? stack.join(", ") : <Empty />}
      </td>
      <td data-label={REGISTRY_COLUMNS[3]} className="lab-row__type">
        {project.project_type ? (
          <span>{formatProjectType(project.project_type)}</span>
        ) : (
          <Empty />
        )}
        {year ? (
          <time className="lab-row__sub t-mono" dateTime={project.started_at}>
            {year}
          </time>
        ) : null}
        <span className="lab-peek" aria-hidden="true">
          <span className="lab-peek__open t-eyebrow">
            Open
            <ArrowRight className="size-3.5" />
          </span>
          <span className="lab-peek__frame glass-2">
            <span className="lab-peek__media">
              <OptimizedMedia
                src={cover?.url}
                alt={resolveMediaAlt(cover, "")}
                fallback="project"
                pillar={project.primary_pillar}
                focalPoint={cover?.focal_point}
                dominantColor={cover?.dominant_color}
                blurDataUrl={cover?.blur_data_url}
                sizes="12rem"
                className="object-cover"
              />
            </span>
          </span>
        </span>
      </td>
    </tr>
  );
}

/** The lab registry: a dense, real table (name, role, stack, type). */
export function ProjectRegistry({
  projects,
  fallbacks,
}: {
  projects: readonly TProjectListItem[];
  fallbacks?: TPublicSiteFallbacksDto | undefined;
}) {
  return (
    <div className="lab-registry">
      <table className="lab-table">
        <caption className="sr-only">
          Projects with their role, stack and type
        </caption>
        <thead>
          <tr>
            {REGISTRY_COLUMNS.map((label) => (
              <th key={label} scope="col" className="t-eyebrow">
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {projects.map((project) => (
            <RegistryRow
              key={project._id}
              project={project}
              fallbacks={fallbacks}
            />
          ))}
        </tbody>
      </table>
    </div>
  );
}
