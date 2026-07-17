// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import AboutDetailsSection from "@/components/(common)/about-page/about-details-section";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/optimized-media", () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt || ""} />,
}));

describe("AboutDetailsSection", () => {
  afterEach(cleanup);

  it("renders About principles from the dynamic Site process", () => {
    const site = createEmergencyPublicSite();
    site.process = [
      {
        key: "discovery",
        title: "Discovery",
        summary: "Map goals and constraints.",
        deliverable: "Problem brief",
        enabled: true,
      },
      {
        key: "hardening",
        title: "Hardening",
        summary: "Verify security and accessibility.",
        deliverable: "Launch checklist",
        enabled: true,
      },
      {
        key: "handoff",
        title: "Handoff",
        summary: "Make operations understandable.",
        deliverable: "Owner notes",
        enabled: true,
      },
      {
        key: "disabled",
        title: "Disabled process",
        enabled: false,
      },
    ];

    render(<AboutDetailsSection site={site} />);

    expect(screen.getByText("Operating principles")).toBeInTheDocument();
    expect(screen.getByText("Problem brief")).toBeInTheDocument();
    expect(screen.getByText("Launch checklist")).toBeInTheDocument();
    expect(screen.getByText("Owner notes")).toBeInTheDocument();
    expect(screen.queryByText("Disabled process")).not.toBeInTheDocument();
  });

  it("keeps engineering disciplines in canonical pillar order", () => {
    const site = createEmergencyPublicSite();
    site.pillars = [...site.pillars].reverse();

    render(<AboutDetailsSection site={site} />);

    const disciplineList = screen.getByRole("list", {
      name: "Engineering disciplines",
    });
    const labels = Array.from(disciplineList.querySelectorAll("li")).map((li) =>
      li.textContent?.replace(/^\d+/, "").trim()
    );

    expect(labels).toEqual(
      PILLAR_KEYS.map(
        (key) => site.pillars.find((pillar) => pillar.key === key)!.label
      )
    );
  });
});
