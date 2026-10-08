import type { PillarKey } from "./pillars";
import type {
  OutcomeVerificationState,
  ProjectType,
} from "./portfolio-contract";

/**
 * Case studies share the engagement and evidence vocabulary of Projects so a
 * result is described the same way in both places. The values are declared
 * here (and checked against the Project contract at compile time) so client
 * forms can import them without pulling in the server-side sanitizer.
 */
export const CASE_STUDY_ENGAGEMENT_TYPES = [
  "client",
  "internal",
  "open_source",
  "lab",
] as const satisfies readonly ProjectType[];

export const CASE_STUDY_OUTCOME_STATES = [
  "derived",
  "verified",
  "unverified",
] as const satisfies readonly OutcomeVerificationState[];

export const CASE_STUDY_LINK_VISIBILITIES = ["public", "hidden"] as const;
export type CaseStudyLinkVisibility =
  (typeof CASE_STUDY_LINK_VISIBILITIES)[number];

export const CASE_STUDY_ENGAGEMENT_LABELS: Readonly<
  Record<ProjectType, string>
> = {
  client: "Client engagement",
  internal: "Internal product",
  open_source: "Open source",
  lab: "Lab experiment",
};

export type CaseStudyOutcome = Readonly<{
  label: string;
  value: string;
  description?: string;
  verification_state: OutcomeVerificationState;
  evidence_reference?: string;
}>;

export type CaseStudyPublishCandidate = Readonly<{
  description?: string;
  primary_pillar?: PillarKey;
  engagement_type?: ProjectType;
  challenge?: string;
  approach?: string;
  solution?: string;
  results_summary?: string;
  outcomes?: readonly CaseStudyOutcome[];
}>;

/** Missing fields that block a Case study from being published. */
export const getCaseStudyPublishReadiness = (
  caseStudy: CaseStudyPublishCandidate
): string[] => {
  const issues: string[] = [];
  if (!caseStudy.description?.trim()) issues.push("description");
  if (!caseStudy.primary_pillar) issues.push("primary_pillar");
  if (!caseStudy.engagement_type) issues.push("engagement_type");
  for (const field of ["challenge", "approach", "solution"] as const) {
    if (!caseStudy[field]?.trim()) issues.push(field);
  }
  const hasResult =
    Boolean(caseStudy.results_summary?.trim()) ||
    Boolean(
      caseStudy.outcomes?.some(
        (outcome) => outcome.verification_state !== "unverified"
      )
    );
  if (!hasResult) issues.push("results");
  return issues;
};
