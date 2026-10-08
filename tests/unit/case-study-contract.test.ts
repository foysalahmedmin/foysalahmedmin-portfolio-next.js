import {
  CASE_STUDY_ENGAGEMENT_TYPES,
  getCaseStudyPublishReadiness,
} from "@/lib/content/case-study-contract";
import { PROJECT_TYPES } from "@/lib/content/portfolio-contract";
import { describe, expect, it } from "vitest";

const complete = {
  description: "A short summary.",
  primary_pillar: "software_developer" as const,
  engagement_type: "internal" as const,
  challenge: "The problem.",
  approach: "The approach.",
  solution: "The solution.",
  results_summary: "What changed.",
};

describe("case study publish readiness", () => {
  it("shares its engagement vocabulary with Projects", () => {
    expect([...CASE_STUDY_ENGAGEMENT_TYPES]).toEqual([...PROJECT_TYPES]);
  });

  it("accepts a complete story", () => {
    expect(getCaseStudyPublishReadiness(complete)).toEqual([]);
  });

  it("accepts a derived outcome instead of a results summary", () => {
    expect(
      getCaseStudyPublishReadiness({
        ...complete,
        results_summary: "",
        outcomes: [
          { label: "Retries", value: "5", verification_state: "derived" },
        ],
      })
    ).toEqual([]);
  });

  it("does not count unverified outcomes as a result", () => {
    expect(
      getCaseStudyPublishReadiness({
        ...complete,
        results_summary: "  ",
        outcomes: [
          { label: "Claim", value: "10x", verification_state: "unverified" },
        ],
      })
    ).toEqual(["results"]);
  });

  it("lists every missing field in a stable order", () => {
    expect(getCaseStudyPublishReadiness({})).toEqual([
      "description",
      "primary_pillar",
      "engagement_type",
      "challenge",
      "approach",
      "solution",
      "results",
    ]);
  });
});
