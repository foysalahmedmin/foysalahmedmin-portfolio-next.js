// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import SkillsSection from "@/components/sections/skills-section";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("SkillsSection", () => {
  afterEach(cleanup);

  it("renders a matrix with evidence counts for published skill groups", () => {
    const site = createEmergencyPublicSite();
    render(
      <SkillsSection
        pillars={site.pillars}
        layout="matrix"
        groups={[
          {
            slug: "backend-systems",
            locale: "en",
            title: "Backend systems",
            summary: "APIs, storage, and operational boundaries.",
            description:
              "Backends built around typed contracts and observability.",
            primary_pillar: "backend",
            secondary_pillars: ["system_design"],
            sequence: 1,
            is_featured: true,
            published_at: "2026-07-17T00:00:00.000Z",
            skills: [
              {
                slug: "api-boundaries",
                locale: "en",
                title: "API boundaries",
                summary: "Public DTOs and validation.",
                primary_pillar: "backend",
                secondary_pillars: [],
                sequence: 1,
                is_featured: true,
                published_at: "2026-07-17T00:00:00.000Z",
                group: { slug: "backend-systems", title: "Backend systems" },
                proficiency_level: "advanced",
                proficiency_verification: "verified",
                keywords: ["DTOs", "Validation", "Caching"],
              },
              {
                slug: "worker-flows",
                locale: "en",
                title: "Worker flows",
                summary: "Background jobs and retries.",
                primary_pillar: "backend",
                secondary_pillars: [],
                sequence: 2,
                is_featured: true,
                published_at: "2026-07-17T00:00:00.000Z",
                group: { slug: "backend-systems", title: "Backend systems" },
                proficiency_level: "working",
                proficiency_verification: "derived",
                keywords: ["Queues", "Retries"],
              },
            ],
          },
        ]}
      />
    );

    expect(screen.getByText("Evidence model")).toBeInTheDocument();
    expect(screen.getByText("Backend systems")).toBeInTheDocument();
    expect(screen.getByText("2 signals")).toBeInTheDocument();
    expect(screen.getByText(/1 verified signal/)).toBeInTheDocument();
    expect(screen.getByText("API boundaries")).toBeInTheDocument();
    expect(screen.getByText("Advanced")).toBeInTheDocument();
  });
});
