import OptimizedMedia from "@/components/ui/optimized-media";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import { getPillarLabel } from "@/lib/content/pillars";
import type { TProjectListItem } from "@/types/project.type";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const TYPE_LABELS = {
  client: "Client work",
  internal: "Internal product",
  open_source: "Open source",
  lab: "Engineering lab",
} as const;

function ProjectCard({ project }: { project: TProjectListItem }) {
  const href = `/projects/${project.slug ?? project._id}`;
  const outcome = project.outcomes?.find(
    ({ verification_state }) => verification_state !== "unverified"
  );

  return (
    <article className="fade-up group bg-card border-border relative overflow-hidden rounded-[var(--radius-xl-token)] border shadow-[var(--shadow-xs)] transition-[border-color,box-shadow,transform] duration-[var(--motion-standard)] hover:shadow-[var(--shadow-md)] motion-safe:hover:-translate-y-1">
      <div className="relative aspect-[4/3] w-full overflow-hidden">
        <OptimizedMedia
          src={project.thumbnail?.url}
          alt={
            project.thumbnail?.alt_text || `${project.name} case-study visual`
          }
          fallback="project"
          pillar={project.primary_pillar}
          sizes="(max-width: 768px) 100vw, 33vw"
          className="h-full w-full object-cover transition-transform duration-[var(--motion-slow)] motion-safe:group-hover:scale-[1.03]"
        />
      </div>

      <div className="p-7 lg:p-8">
        <div className="text-muted-foreground mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs font-bold tracking-wide uppercase">
          {project.project_type ? (
            <span>{TYPE_LABELS[project.project_type]}</span>
          ) : null}
          {project.primary_pillar ? (
            <span>{getPillarLabel(project.primary_pillar)}</span>
          ) : null}
        </div>
        <h3 className="group-hover:text-primary text-2xl font-black tracking-tight transition-colors">
          {project.name}
        </h3>
        {project.description ? (
          <p className="text-muted-foreground mt-3 line-clamp-3 leading-relaxed">
            {project.description}
          </p>
        ) : null}
        {outcome ? (
          <p className="border-border mt-5 border-l-2 pl-4 text-sm">
            <span className="font-bold">{outcome.label}:</span> {outcome.value}
          </p>
        ) : null}
        <Link
          href={href}
          className="text-primary focus-visible:ring-ring mt-7 inline-flex min-h-11 items-center gap-2 rounded-sm text-sm font-black tracking-widest uppercase underline-offset-8 hover:underline focus-visible:ring-2"
        >
          Read case study <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

export default function ProjectsSection({
  projects,
  unavailable = false,
  heading,
}: {
  projects: readonly TProjectListItem[];
  unavailable?: boolean;
  heading?: string;
}) {
  return (
    <section id="projects" className="py-[var(--space-section)]">
      <div className="container">
        <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
          <SectionTitle variant="none" className="mb-0 max-w-2xl">
            <Subtitle>Project evidence</Subtitle>
            <Title>{heading || "Published technical case studies"}</Title>
            <Description className="mx-0">
              Public records show only approved project context, engineering
              decisions, and verified or derived outcomes.
            </Description>
          </SectionTitle>
          <Link
            href="/projects"
            className="border-border hover:border-primary focus-visible:ring-ring inline-flex min-h-11 w-fit items-center gap-3 rounded-full border px-5 text-sm font-bold focus-visible:ring-2"
          >
            Explore projects{" "}
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>

        {projects.length ? (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {projects.slice(0, 6).map((project) => (
              <ProjectCard key={project._id} project={project} />
            ))}
          </div>
        ) : (
          <div className="border-border bg-surface-subtle rounded-[var(--radius-lg-token)] border p-8 text-center">
            <h3 className="font-bold">
              {unavailable
                ? "Case studies are temporarily unavailable"
                : "No approved public case study is available yet"}
            </h3>
            <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
              {unavailable
                ? "The public portfolio reader could not be reached. The projects page can be retried directly."
                : "Draft, incomplete, and unverified records stay private until their publication checks pass."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
