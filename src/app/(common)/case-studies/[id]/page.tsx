import * as CaseStudyService from "@/app/api/case-studies/case-study.service";
import CaseStudyDetailsSection from "@/components/(common)/case-studies-page/case-study-details-section";
import { JsonLdScript } from "@/components/content/json-ld-script";
import AppError from "@/builder/app-error";
import { toSerializableCaseStudyListItem } from "@/lib/discovery/case-study-discovery";
import {
  buildBreadcrumbJsonLd,
  buildCreativeWorkJsonLd,
  buildWebPageJsonLd,
} from "@/lib/metadata/json-ld";
import { buildPageMetadata } from "@/lib/metadata/site-metadata";
import { resolvePublicContentFallback } from "@/lib/site/public-content-fallback";
import { readPublishedSite } from "@/lib/site/published-site";
import type { TPublicCaseStudy } from "@/types/case-study.type";
import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

const asMetadataImage = (file: TPublicCaseStudy["thumbnail"]) =>
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
    const caseStudy = (await CaseStudyService.getPublicCaseStudyByIdentifier(
      id
    )) as unknown as TPublicCaseStudy;
    return buildPageMetadata(site, {
      pathname: `/case-studies/${caseStudy.slug ?? id}`,
      title: caseStudy.name,
      description: caseStudy.description,
      kind: "project",
      pillar: caseStudy.primary_pillar,
      image: asMetadataImage(caseStudy.thumbnail),
    });
  } catch {
    return {
      title: "Case study unavailable",
      robots: { index: false, follow: false },
    };
  }
}

export default async function CaseStudyDetailsPage({ params }: Props) {
  const { id } = await params;
  let caseStudy: TPublicCaseStudy;
  try {
    caseStudy = (await CaseStudyService.getPublicCaseStudyByIdentifier(
      id
    )) as unknown as TPublicCaseStudy;
  } catch (error) {
    if (error instanceof AppError && error.status === 404) notFound();
    throw error;
  }
  if (caseStudy.slug && caseStudy.slug !== id) {
    permanentRedirect(`/case-studies/${caseStudy.slug}`);
  }

  const [site, relatedResult] = await Promise.all([
    readPublishedSite(),
    CaseStudyService.getPublicCaseStudyDiscovery({
      ...(caseStudy.primary_pillar ? { pillar: caseStudy.primary_pillar } : {}),
      sort: "newest",
    }).catch(() => ({ data: [] })),
  ]);
  const related = relatedResult.data
    .flatMap((record) => {
      const item = toSerializableCaseStudyListItem(record);
      return item ? [item] : [];
    })
    .filter((item) => item._id !== caseStudy._id)
    .slice(0, 3);
  const managedFallback = resolvePublicContentFallback({
    kind: "project",
    pillar: caseStudy.primary_pillar,
    fallbacks: site.fallbacks,
  });
  const coverUrl = caseStudy.thumbnail?.url || managedFallback?.url;

  const pathname = `/case-studies/${caseStudy.slug ?? id}`;
  const structuredData = [
    buildWebPageJsonLd(site, {
      pathname,
      title: caseStudy.name,
      description: caseStudy.description,
    }),
    buildCreativeWorkJsonLd(site, {
      pathname,
      title: caseStudy.name,
      description: caseStudy.description,
      created_at: caseStudy.started_at ?? caseStudy.published_at,
      creator_name: caseStudy.author?.name,
      image_url: coverUrl,
      keywords: [
        ...(caseStudy.keywords ?? []),
        ...(caseStudy.tech_stack ?? []),
        ...(caseStudy.primary_pillar ? [caseStudy.primary_pillar] : []),
      ],
    }),
    buildBreadcrumbJsonLd(site, [
      { name: "Home", pathname: "/" },
      { name: "Case studies", pathname: "/case-studies" },
      { name: caseStudy.name, pathname },
    ]),
  ].filter((item) => item !== null);

  return (
    <>
      <JsonLdScript data={structuredData} />
      <CaseStudyDetailsSection
        caseStudy={caseStudy}
        related={related}
        fallbacks={site.fallbacks}
      />
    </>
  );
}
