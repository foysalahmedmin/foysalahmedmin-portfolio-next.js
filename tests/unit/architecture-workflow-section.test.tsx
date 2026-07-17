// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import ArchitectureWorkflowSection from "@/components/sections/architecture-workflow-section";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

describe("ArchitectureWorkflowSection", () => {
  afterEach(cleanup);

  it("renders the truthful architecture, AI automation, and guardrail story", () => {
    const site = createEmergencyPublicSite();
    site.process = [
      {
        key: "discovery",
        title: "Discovery",
        summary: "Map constraints.",
        enabled: true,
      },
      {
        key: "release",
        title: "Release",
        summary: "Ship safely.",
        enabled: true,
      },
    ];

    render(<ArchitectureWorkflowSection site={site} layout="bento" />);

    expect(
      screen.getByRole("heading", {
        name: "A product system, not a stack of disconnected skills",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("AI automation lane")).toBeInTheDocument();
    expect(screen.getByText("Security boundary")).toBeInTheDocument();
    expect(screen.getByText("Discovery")).toBeInTheDocument();
    for (const pillar of site.pillars) {
      expect(screen.getByText(pillar.label)).toBeInTheDocument();
    }
  });
});
