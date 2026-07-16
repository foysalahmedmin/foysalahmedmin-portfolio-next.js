import * as ProjectResourceService from "@/app/api/project-resources/project-resource.service";
import * as ProjectService from "@/app/api/projects/project.service";
import { JsonLdScript } from "@/components/content/json-ld-script";
import ProjectDetailsSection, {
  type TPublicProjectResource,
} from "@/components/(common)/projects-page/project-details-section";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import {
  buildBreadcrumbJsonLd,
  buildCreativeWorkJsonLd,
  buildWebPageJsonLd,
} from "@/lib/metadata/json-ld";
import { readPublishedSite } from "@/lib/site/published-site";
import { resolvePublicContentFallback } from "@/lib/site/public-content-fallback";
import type { TProject, TProjectListItem } from "@/types/project.type";
import AppError from "@/builder/app-error";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

const asMetadataImage = (file: TProject["thumbnail"]) =>
  file
    ? {
        id: file._id,
        url: file.url,
        ...(file.alt_text ? { alt_text: file.alt_text } : {}),
        ...(file.metadata?.width && typeof file.metadata.width === "number"
          ? { width: file.metadata.width }
          : {}),
        ...(file.metadata?.height && typeof file.metadata.height === "number"
          ? { height: file.metadata.height }
          : {}),
      }
    : undefined;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const site = await readPublishedSite();
  try {
    const project = (await ProjectService.getPublicProjectByIdentifier(
      id
    )) as unknown as TProject;
    const path = `/projects/${project.slug ?? id}`;
    return buildPageMetadata(site, {
      pathname: path,
      title: project.name,
      description: project.description,
      kind: "project",
      pillar: project.primary_pillar,
      image: asMetadataImage(project.thumbnail),
    });
  } catch {
    return {
      title: "Project unavailable",
      robots: { index: false, follow: false },
    };
  }
}

export default async function ProjectDetailsPage({ params }: Props) {
  const { id } = await params;
  let project: TProject;
  try {
    project = (await ProjectService.getPublicProjectByIdentifier(
      id
    )) as unknown as TProject;
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  if (project.slug && project.slug !== id) {
    permanentRedirect(`/projects/${project.slug}`);
  }

  const [site, resourceResult, relatedResult] = await Promise.all([
    readPublishedSite(),
    ProjectResourceService.getPublicProjectResources({
      project: project._id,
      limit: 20,
      sort: "sequence,title",
    }).catch(() => ({ data: [] })),
    project.primary_pillar
      ? ProjectService.getPublicProjects({
          primary_pillar: project.primary_pillar,
          limit: 4,
          sort: "-started_at,name",
        }).catch(() => ({ data: [] }))
      : Promise.resolve({ data: [] }),
  ]);

  const resources = resourceResult.data as unknown as TPublicProjectResource[];
  const related = (relatedResult.data as unknown as TProjectListItem[])
    .filter((item) => item._id !== project._id)
    .slice(0, 3);
  const managedFallback = resolvePublicContentFallback({
    kind: "project",
    pillar: project.primary_pillar,
    fallbacks: site.fallbacks,
  });
  const coverUrl = project.thumbnail?.url || managedFallback?.url;

  const pathname = `/projects/${project.slug ?? id}`;
  const structuredData = [
    buildWebPageJsonLd(site, {
      pathname,
      title: project.name,
      description: project.description,
    }),
    buildCreativeWorkJsonLd(site, {
      pathname,
      title: project.name,
      description: project.description,
      created_at: project.started_at,
      creator_name: project.author?.name,
      image_url: coverUrl,
      keywords: [
        ...(project.tags ?? []),
        ...(project.primary_pillar ? [project.primary_pillar] : []),
      ],
    }),
    buildBreadcrumbJsonLd(site, [
      { name: "Home", pathname: "/" },
      { name: "Projects", pathname: "/projects" },
      { name: project.name, pathname },
    ]),
  ].filter((item) => item !== null);

  return (
    <>
      <JsonLdScript data={structuredData} />
      <ProjectDetailsSection
        project={project}
        resources={resources}
        related={related}
        fallbacks={site.fallbacks}
      />
    </>
  );
}
