// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import ArchitectureWorkflowSection from "@/components/sections/architecture-workflow-section";
import { PILLAR_KEYS } from "@/lib/content/pillars";
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

    const { container } = render(
      <ArchitectureWorkflowSection site={site} layout="bento" />
    );

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
    expect(
      screen.getByRole("list", {
        name: "Six-pillar system map in canonical order",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("list", {
        name: "AI automation workflow with human review boundaries",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("navigation", {
        name: "Related technical insight paths",
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /system design writing/i })
    ).toHaveAttribute("href", "/articles?pillar=system_design");
    expect(
      screen.getByRole("link", { name: /ai automation writing/i })
    ).toHaveAttribute("href", "/articles?pillar=ai_automation");
    expect(
      screen.getByRole("link", { name: /full-stack delivery writing/i })
    ).toHaveAttribute("href", "/articles?pillar=full_stack");
    expect(container.querySelector("canvas")).not.toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("keeps the text-based system map canonical when Site pillar order changes", () => {
    const site = createEmergencyPublicSite();
    site.pillars = [
      ...[...site.pillars].reverse(),
      {
        ...site.pillars[0]!,
        label: "Duplicate Frontend should not render",
        order: 99,
      },
    ];

    render(<ArchitectureWorkflowSection site={site} layout="bento" />);

    const systemMap = screen.getByRole("list", {
      name: "Six-pillar system map in canonical order",
    });
    const labels = Array.from(systemMap.querySelectorAll("h4")).map(
      (heading) => heading.textContent
    );

    expect(labels).toEqual(
      PILLAR_KEYS.map(
        (key) => site.pillars.find((pillar) => pillar.key === key)!.label
      )
    );
    expect(
      screen.queryByText("Duplicate Frontend should not render")
    ).not.toBeInTheDocument();
  });
});
