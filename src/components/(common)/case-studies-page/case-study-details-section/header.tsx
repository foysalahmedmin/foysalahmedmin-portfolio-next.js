import type { PageHeaderProps } from "@/components/templates";
import { buttonVariants } from "@/components/ui/button-variants";
import { CASE_STUDY_ENGAGEMENT_LABELS } from "@/lib/content/case-study-contract";
import { getPillarLabel } from "@/lib/content/pillars";
import { isAllowedPublicProjectUrl } from "@/lib/content/portfolio-contract";
import type { TPublicCaseStudy } from "@/types/case-study.type";
import { ArrowUpRight } from "lucide-react";

/** Only allowlisted public HTTPS addresses become links; the server already drops hidden ones. */
export const getCaseStudyLinks = (caseStudy: TPublicCaseStudy) =>
  [
    caseStudy.live_url && isAllowedPublicProjectUrl(caseStudy.live_url)
      ? { label: "Open live product", href: caseStudy.live_url }
      : null,
    caseStudy.source_url && isAllowedPublicProjectUrl(caseStudy.source_url)
      ? { label: "View public source", href: caseStudy.source_url }
      : null,
  ].filter((link): link is { label: string; href: string } => Boolean(link));

/**
 * The shared PageHeader content for a case file: the system path doubles as the breadcrumb, the lede is
 * the one-line summary, the Mono row says what kind of file this is, and the actions are the safe links.
 */
export const getCaseStudyHeader = (
  caseStudy: TPublicCaseStudy
): PageHeaderProps => {
  const meta = [
    caseStudy.primary_pillar ? getPillarLabel(caseStudy.primary_pillar) : null,
    caseStudy.engagement_type
      ? CASE_STUDY_ENGAGEMENT_LABELS[caseStudy.engagement_type]
      : null,
    caseStudy.category?.name ?? null,
  ].filter((item): item is string => Boolean(item));
  const links = getCaseStudyLinks(caseStudy);

  return {
    title: caseStudy.name,
    lede: caseStudy.description,
    path: [
      { index: 1, name: "Home", href: "/" },
      { index: 2, name: "Case studies", href: "/case-studies" },
      { index: 3, name: caseStudy.name },
    ],
    meta: meta.length
      ? meta.map((item, index) => <span key={index}>{item}</span>)
      : undefined,
    actions: links.length
      ? links.map((link) => (
          <a
            key={link.href}
            href={link.href}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: "outline" })}
          >
            {link.label}
            <ArrowUpRight className="size-4" aria-hidden="true" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ))
      : undefined,
  };
};
