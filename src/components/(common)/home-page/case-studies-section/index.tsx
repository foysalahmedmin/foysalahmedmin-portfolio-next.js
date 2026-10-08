import type { TPublicSiteFallbacksDto } from "@/app/api/site/site.type";
import { CaseStudyCard } from "@/components/content/case-study-card";
import {
  Description,
  SectionTitle,
  Subtitle,
  Title,
} from "@/components/ui/section-title";
import type { TCaseStudyListItem } from "@/types/case-study.type";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

const CaseStudiesSection = ({
  caseStudies,
  fallbacks,
  heading,
  unavailable = false,
}: {
  caseStudies: readonly TCaseStudyListItem[];
  fallbacks?: TPublicSiteFallbacksDto;
  heading?: string;
  unavailable?: boolean;
}) => (
  <section id="case-studies" className="py-[var(--space-section)]">
    <div className="container">
      <div className="mb-14 flex flex-col justify-between gap-8 md:flex-row md:items-end">
        <SectionTitle variant="none" className="mb-0 max-w-2xl">
          <Subtitle>Case studies</Subtitle>
          <Title>{heading || "Problems solved, start to finish"}</Title>
          <Description className="mx-0">
            Each story starts with the business problem, then shows the
            approach, the solution, and what changed as a result.
          </Description>
        </SectionTitle>
        <Link
          href="/case-studies"
          className="border-border hover:border-primary focus-visible:ring-ring inline-flex min-h-11 w-fit items-center gap-3 rounded-full border px-5 text-sm font-bold focus-visible:ring-2"
        >
          All case studies
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </div>

      {caseStudies.length ? (
        <ul className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
          {caseStudies.slice(0, 6).map((caseStudy) => (
            <li key={caseStudy._id} className="fade-up min-w-0">
              <CaseStudyCard caseStudy={caseStudy} fallbacks={fallbacks} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="border-border bg-surface-subtle rounded-[var(--radius-lg-token)] border p-8 text-center">
          <h3 className="font-bold">
            {unavailable
              ? "Case studies are temporarily unavailable"
              : "No published case study is available yet"}
          </h3>
          <p className="text-muted-foreground mx-auto mt-2 max-w-xl text-sm">
            {unavailable
              ? "The case study library could not be reached. The case studies page can be retried directly."
              : "Case studies stay private until their story and results are complete."}
          </p>
        </div>
      )}
    </div>
  </section>
);

export default CaseStudiesSection;
