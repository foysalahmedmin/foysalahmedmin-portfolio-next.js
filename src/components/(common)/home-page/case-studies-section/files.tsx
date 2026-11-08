import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import Reveal from "@/components/motion/reveal";
import { SectionHead } from "@/components/sections/signal/section-head";
import OptimizedMedia from "@/components/ui/optimized-media";
import { Tag } from "@/components/ui/tag";
import { TextLink } from "@/components/ui/text-link";
import { CASE_STUDY_ENGAGEMENT_LABELS } from "@/lib/content/case-study-contract";
import { getPillarLabel } from "@/lib/content/pillars";
import { resolveMediaAlt } from "@/lib/media/presentation";
import { resolvePublicContentFallback } from "@/lib/site/public-content-fallback";
import type { TCaseStudyListItem } from "@/types/case-study.type";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const FILES_LEAD =
  "Every case file follows the same four steps: the problem, the constraints, the architecture and the result.";
const MAX_ROWS = 6;

/**
 * One case file: a hairline row, not a card. The greyscale preview is a CSS-only enhancement (hover or
 * keyboard focus on the title link); everything it could say is already in the row, so nothing is
 * hover-only. The thumbnail stays out of the accessibility tree.
 */
export function CaseFileRow({
  caseStudy,
  fallbacks,
  index,
  count,
}: {
  caseStudy: TCaseStudyListItem;
  fallbacks?: TPublicSiteFallbacksDto;
  index: number;
  count: number;
}) {
  const href = `/case-studies/${caseStudy.slug ?? caseStudy._id}`;
  const engagement = caseStudy.engagement_type
    ? CASE_STUDY_ENGAGEMENT_LABELS[caseStudy.engagement_type]
    : undefined;
  const role = caseStudy.primary_pillar
    ? getPillarLabel(caseStudy.primary_pillar)
    : undefined;
  const outcome = caseStudy.outcomes?.find(
    (item) => item.verification_state !== "unverified"
  );
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

  return (
    <Reveal as="li" index={index} count={count} className="case-file">
      <div className="case-file__head">
        <h3 className="case-file__title">
          <Link href={href} className="case-file__link link-draw">
            {caseStudy.name}
          </Link>
        </h3>
        {engagement ? (
          <Tag
            className="case-file__chip"
            data-engagement={caseStudy.engagement_type}
          >
            {engagement}
          </Tag>
        ) : null}
      </div>

      <dl className="case-file__facts">
        {caseStudy.description ? (
          <div className="case-file__fact" data-fact="problem">
            <dt className="t-eyebrow text-fg-secondary">Problem</dt>
            <dd>{caseStudy.description}</dd>
          </div>
        ) : null}
        {role ? (
          <div className="case-file__fact" data-fact="role">
            <dt className="t-eyebrow text-fg-secondary">Role</dt>
            <dd>{role}</dd>
          </div>
        ) : null}
        {outcome ? (
          <div className="case-file__fact" data-fact="outcome">
            <dt className="t-eyebrow text-fg-secondary">Outcome</dt>
            <dd>
              <strong className="t-mono">{outcome.value}</strong>{" "}
              <span className="text-fg-secondary">{outcome.label}</span>
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="case-file__peek" aria-hidden="true">
        <span className="case-file__open t-eyebrow">
          Open
          <ArrowRight className="size-3.5" />
        </span>
        <div className="case-file__peek-frame glass-2">
          <div className="case-file__peek-media">
            <OptimizedMedia
              src={cover?.url}
              alt={resolveMediaAlt(cover, "")}
              fallback="project"
              pillar={caseStudy.primary_pillar}
              focalPoint={cover?.focal_point}
              dominantColor={cover?.dominant_color}
              blurDataUrl={cover?.blur_data_url}
              sizes="12rem"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </Reveal>
  );
}

/** Chapter 4, case files (docs plan 4.1): a dense list of case files. `empty` is the section's unchanged empty or unavailable state. */
export default function CaseFiles({
  caseStudies,
  fallbacks,
  heading,
  empty,
}: {
  caseStudies: readonly TCaseStudyListItem[];
  fallbacks?: TPublicSiteFallbacksDto;
  heading?: string;
  empty: ReactNode;
}) {
  const rows = caseStudies.slice(0, MAX_ROWS);

  return (
    <section
      id="case-studies"
      aria-labelledby="case-studies-heading"
      data-chapter="files"
      data-chapter-label="Case files"
      className="py-[var(--space-section)]"
    >
      <div className="container">
        <div className="mb-12 flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <Reveal>
            <SectionHead
              eyebrow="/files"
              title={heading || "Problems solved, start to finish"}
              titleId="case-studies-heading"
              lead={FILES_LEAD}
            />
          </Reveal>
          <TextLink href="/case-studies" variant="quiet" className="shrink-0">
            All case studies
            <ArrowRight className="size-4 self-center" aria-hidden="true" />
          </TextLink>
        </div>

        {rows.length ? (
          <ul className="case-files" aria-label="Case files">
            {rows.map((caseStudy, index) => (
              <CaseFileRow
                key={caseStudy._id}
                caseStudy={caseStudy}
                fallbacks={fallbacks}
                index={index}
                count={rows.length}
              />
            ))}
          </ul>
        ) : (
          empty
        )}
      </div>
    </section>
  );
}
