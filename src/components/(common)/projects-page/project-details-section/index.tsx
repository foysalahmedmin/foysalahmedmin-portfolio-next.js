import { RichContentRenderer } from "@/components/content/rich-content-renderer";
import { ProjectGallery } from "@/components/content/project-gallery";
import ParallaxLayer from "@/components/motion/parallax-layer";
import OptimizedMedia from "@/components/ui/optimized-media";
import { getPillarLabel } from "@/lib/content/pillars";
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";
import type { TProject, TProjectListItem } from "@/types/project.type";
import {
  ArrowLeft,
  ArrowRight,
  ArrowUpRight,
  CheckCircle2,
  ExternalLink,
  Layers3,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

export type TPublicProjectResource = Readonly<{
  _id?: string;
  title: string;
  url: string;
  type: "repository" | "design" | "documentation" | "other";
  description?: string;
  sequence?: number;
}>;

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

const ProjectDetailsSection = ({
  project,
  resources,
  related,
}: {
  project: TProject;
  resources: readonly TPublicProjectResource[];
  related: readonly TProjectListItem[];
}) => {
  const pillar = project.primary_pillar
    ? getPillarLabel(project.primary_pillar)
    : null;
  const publicLinks = [
    project.live_url && isAllowedPublicProjectUrl(project.live_url)
      ? { label: "Open live product", href: project.live_url }
      : null,
    project.source_url && isAllowedPublicProjectUrl(project.source_url)
      ? { label: "View public source", href: project.source_url }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));
  const safeResources = resources.filter((resource) =>
    isAllowedPublicProjectUrl(resource.url)
  );

  return (
    <main className="bg-background min-h-screen">
      <header className="relative overflow-hidden pt-20 pb-16 lg:pt-28 lg:pb-24">
        <div className="bg-primary/10 pointer-events-none absolute top-0 left-1/2 h-[30rem] w-[70rem] -translate-x-1/2 rounded-full blur-[140px]" />
        <div className="relative container mx-auto px-6">
          <Link
            href="/projects"
            className="text-muted-foreground hover:text-primary focus-visible:ring-primary inline-flex min-h-11 items-center gap-2 rounded-lg pr-3 text-sm font-bold focus-visible:ring-2 focus-visible:outline-none"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            All projects
          </Link>
          <div className="mt-10 max-w-5xl">
            <div className="flex flex-wrap gap-2">
              {pillar && (
                <span className="bg-primary/10 text-primary rounded-full px-3 py-1.5 text-xs font-black">
                  {pillar}
                </span>
              )}
              {project.project_type && (
                <span className="border-border bg-card rounded-full border px-3 py-1.5 text-xs font-bold">
                  {project.project_type.replaceAll("_", " ")}
                </span>
              )}
              {project.delivery_status && (
                <span className="border-border bg-card rounded-full border px-3 py-1.5 text-xs font-bold">
                  {project.delivery_status}
                </span>
              )}
            </div>
            <h1 className="mt-6 text-5xl leading-[0.95] font-black tracking-tight text-balance sm:text-6xl lg:text-8xl">
              {project.name}
            </h1>
            {project.description && (
              <p className="text-muted-foreground mt-7 max-w-3xl text-xl leading-9">
                {project.description}
              </p>
            )}
            {publicLinks.length > 0 && (
              <div className="mt-8 flex flex-wrap gap-3">
                {publicLinks.map((link) => (
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
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6">
        <div className="border-border bg-surface-subtle relative aspect-[16/9] overflow-hidden rounded-[2rem] border shadow-[var(--shadow-lg)] lg:aspect-[21/9]">
          <ParallaxLayer className="absolute -inset-[3%]" depth="subtle">
            <OptimizedMedia
              src={project.thumbnail?.url}
              alt={
                project.thumbnail?.is_decorative
                  ? ""
                  : project.thumbnail?.alt_text || project.name
              }
              fallback="project"
              pillar={project.primary_pillar}
              sizes="100vw"
              priority
              className="object-cover"
              style={
                project.thumbnail?.focal_point
                  ? {
                      objectPosition: `${Math.round(
                        project.thumbnail.focal_point.x * 100
                      )}% ${Math.round(project.thumbnail.focal_point.y * 100)}%`,
                    }
                  : undefined
              }
            />
          </ParallaxLayer>
        </div>
      </div>

      <article className="container mx-auto grid gap-16 px-6 py-20 lg:grid-cols-[minmax(0,1fr)_20rem] lg:py-28">
        <div className="min-w-0 space-y-14">
          <RichContentRenderer
            document={project.rich_content}
            legacyHtml={project.content}
          />

          {project.problem && (
            <DetailSection
              id="problem"
              eyebrow="01 · Context"
              title="The problem"
            >
              <p>{project.problem}</p>
            </DetailSection>
          )}
          {(project.role || project.constraints?.length) && (
            <DetailSection
              id="role-constraints"
              eyebrow="02 · Boundaries"
              title="Role and constraints"
            >
              {project.role && <p>{project.role}</p>}
              {project.constraints && project.constraints.length > 0 && (
                <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                  {project.constraints.map((item) => (
                    <li
                      key={item}
                      className="border-border bg-card rounded-xl border p-4 text-sm leading-6"
                    >
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </DetailSection>
          )}
          {(project.architecture || project.decisions?.length) && (
            <DetailSection
              id="architecture"
              eyebrow="03 · System"
              title="Architecture and decisions"
            >
              {project.architecture && <p>{project.architecture}</p>}
              {project.decisions && project.decisions.length > 0 && (
                <ol className="mt-6 space-y-3">
                  {project.decisions.map((decision, index) => (
                    <li key={decision} className="flex gap-3">
                      <span className="text-primary font-black tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <span>{decision}</span>
                    </li>
                  ))}
                </ol>
              )}
            </DetailSection>
          )}
          {project.implementation && (
            <DetailSection
              id="implementation"
              eyebrow="04 · Delivery"
              title="Implementation"
            >
              <p>{project.implementation}</p>
            </DetailSection>
          )}
          {(project.security || project.performance_reliability) && (
            <DetailSection
              id="quality"
              eyebrow="05 · Quality"
              title="Security and reliability"
            >
              <div className="grid gap-4 md:grid-cols-2">
                {project.security && (
                  <div className="border-border bg-card rounded-2xl border p-5">
                    <ShieldCheck
                      className="text-primary size-5"
                      aria-hidden="true"
                    />
                    <h3 className="text-foreground mt-3 font-bold">
                      Security boundary
                    </h3>
                    <p className="mt-2 text-sm leading-7">{project.security}</p>
                  </div>
                )}
                {project.performance_reliability && (
                  <div className="border-border bg-card rounded-2xl border p-5">
                    <Layers3
                      className="text-primary size-5"
                      aria-hidden="true"
                    />
                    <h3 className="text-foreground mt-3 font-bold">
                      Performance and reliability
                    </h3>
                    <p className="mt-2 text-sm leading-7">
                      {project.performance_reliability}
                    </p>
                  </div>
                )}
              </div>
            </DetailSection>
          )}
          {project.outcomes && project.outcomes.length > 0 && (
            <DetailSection
              id="outcomes"
              eyebrow="06 · Evidence"
              title="Measured outcomes"
            >
              <div className="grid gap-4 sm:grid-cols-2">
                {project.outcomes.map((outcome) => (
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
                    <p className="mt-3 text-[0.65rem] font-black tracking-wide uppercase">
                      {outcome.verification_state === "verified"
                        ? "Evidence verified"
                        : "Derived from approved data"}
                    </p>
                  </div>
                ))}
              </div>
            </DetailSection>
          )}
          {project.learnings && project.learnings.length > 0 && (
            <DetailSection
              id="learnings"
              eyebrow="07 · Reflection"
              title="Learnings"
            >
              <ul className="space-y-3">
                {project.learnings.map((learning) => (
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
          )}

          {project.images && project.images.length > 0 && (
            <DetailSection
              id="gallery"
              eyebrow="08 · Visual proof"
              title="Project gallery"
            >
              <ProjectGallery
                images={project.images}
                projectName={project.name}
                pillar={project.primary_pillar}
              />
            </DetailSection>
          )}
        </div>

        <aside className="h-fit space-y-6 lg:sticky lg:top-28">
          <div className="border-border bg-card rounded-2xl border p-6">
            <h2 className="font-black">Project facts</h2>
            <dl className="mt-5 space-y-4 text-sm">
              {pillar && (
                <div>
                  <dt className="text-muted-foreground">Primary pillar</dt>
                  <dd className="mt-1 font-bold">{pillar}</dd>
                </div>
              )}
              {project.role && (
                <div>
                  <dt className="text-muted-foreground">Role</dt>
                  <dd className="mt-1 line-clamp-4 font-bold">
                    {project.role}
                  </dd>
                </div>
              )}
              {project.tags && project.tags.length > 0 && (
                <div>
                  <dt className="text-muted-foreground">Stack and topics</dt>
                  <dd className="mt-2 flex flex-wrap gap-1.5">
                    {project.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-muted rounded-md px-2 py-1 text-xs font-semibold"
                      >
                        {tag}
                      </span>
                    ))}
                  </dd>
                </div>
              )}
            </dl>
          </div>
          {safeResources.length > 0 && (
            <div className="border-border bg-card rounded-2xl border p-6">
              <h2 className="font-black">Public resources</h2>
              <ul className="mt-4 space-y-2">
                {safeResources.map((resource) => (
                  <li key={resource._id ?? resource.url}>
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-primary focus-visible:ring-primary flex min-h-11 items-center justify-between gap-3 rounded-lg text-sm font-bold focus-visible:ring-2 focus-visible:outline-none"
                    >
                      {resource.title}
                      <ExternalLink
                        className="size-4 shrink-0"
                        aria-hidden="true"
                      />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <div className="bg-primary text-primary-foreground rounded-2xl p-6">
            <h2 className="text-xl font-black">A related product challenge?</h2>
            <p className="mt-3 text-sm leading-6 opacity-85">
              Share the desired outcome and system constraints through the
              protected intake.
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

      {related.length > 0 && (
        <section
          className="border-border bg-surface-subtle border-t py-20"
          aria-labelledby="related-projects-title"
        >
          <div className="container mx-auto px-6">
            <h2
              id="related-projects-title"
              className="text-3xl font-black tracking-tight"
            >
              Related work
            </h2>
            <div className="mt-8 grid gap-4 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item._id}
                  href={`/projects/${item.slug ?? item._id}`}
                  className="border-border bg-card hover:border-primary group rounded-2xl border p-6"
                >
                  <p className="text-primary text-xs font-black uppercase">
                    {item.primary_pillar
                      ? getPillarLabel(item.primary_pillar)
                      : "Project"}
                  </p>
                  <h3 className="mt-3 text-xl font-black">{item.name}</h3>
                  {item.description && (
                    <p className="text-muted-foreground mt-3 line-clamp-2 text-sm leading-6">
                      {item.description}
                    </p>
                  )}
                  <span className="text-primary mt-5 inline-flex items-center gap-2 text-sm font-bold">
                    View case study
                    <ArrowRight
                      className="size-4 transition-transform group-hover:translate-x-1"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </main>
  );
};

export default ProjectDetailsSection;
