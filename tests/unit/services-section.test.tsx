// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import ServicesSection from "@/components/sections/services-section";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("ServicesSection", () => {
  afterEach(cleanup);

  it("renders service capabilities and deliverables without repeating generic chips", () => {
    const site = createEmergencyPublicSite();
    render(
      <ServicesSection
        pillars={site.pillars}
        layout="cards"
        services={[
          {
            slug: "system-delivery",
            locale: "en",
            title: "System delivery",
            summary: "Plan and build a reliable product system.",
            outcome: "A production-ready architecture and delivery plan.",
            primary_pillar: "system_design",
            secondary_pillars: ["backend"],
            sequence: 0,
            is_featured: true,
            published_at: "2026-07-17T00:00:00.000Z",
            capabilities: ["Architecture boundaries"],
            deliverables: ["RFC", "Release checklist"],
            technologies: ["Next.js", "MongoDB"],
          },
        ]}
      />
    );

    expect(screen.getByText("System delivery")).toBeInTheDocument();
    expect(screen.getByText("Capability shape")).toBeInTheDocument();
    expect(screen.getByText("Deliverables")).toBeInTheDocument();
    expect(screen.getByText("RFC")).toBeInTheDocument();
    expect(screen.getByText("System Design")).toBeInTheDocument();
  });
});
