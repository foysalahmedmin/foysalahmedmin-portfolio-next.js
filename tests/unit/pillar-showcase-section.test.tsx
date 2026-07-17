// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import PillarShowcaseSection from "@/components/sections/pillar-showcase-section";
import { PILLAR_KEYS } from "@/lib/content/pillars";
import { cleanup, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/motion/parallax-layer", () => ({
  default: ({ children }: { children?: ReactNode }) => <div>{children}</div>,
}));

describe("PillarShowcaseSection", () => {
  afterEach(cleanup);

  it("renders the sticky five-pillar operating-system narrative", () => {
    const site = createEmergencyPublicSite();
    render(<PillarShowcaseSection pillars={site.pillars} layout="sticky" />);

    expect(
      screen.getByRole("heading", {
        name: "A full-stack practice with one consistent spine",
      })
    ).toBeInTheDocument();
    expect(screen.getByText("Delivery principle")).toBeInTheDocument();
    for (const pillar of site.pillars) {
      expect(
        screen.getByRole("heading", { name: pillar.label })
      ).toBeInTheDocument();
    }
    expect(
      screen.getAllByRole("link", { name: "Projects" })[0]
    ).toHaveAttribute("href", "/projects?pillar=frontend");
    expect(
      screen.getAllByRole("link", { name: "Articles" })[3]
    ).toHaveAttribute("href", "/articles?pillar=system_design");
    expect(
      screen.getAllByRole("link", { name: "Services" })[0]
    ).toHaveAttribute("href", "#services");
  });

  it("renders each enabled canonical pillar exactly once in contract order", () => {
    const site = createEmergencyPublicSite();
    const scrambled = [
      ...[...site.pillars].reverse(),
      {
        ...site.pillars[0]!,
        label: "Duplicate Frontend should not render",
        order: 99,
      },
    ];

    render(<PillarShowcaseSection pillars={scrambled} layout="sticky" />);

    const projectLinks = screen.getAllByRole("link", { name: "Projects" });
    expect(projectLinks).toHaveLength(PILLAR_KEYS.length);
    expect(projectLinks.map((link) => link.getAttribute("href"))).toEqual(
      PILLAR_KEYS.map((pillar) => `/projects?pillar=${pillar}`)
    );
    expect(
      screen.queryByRole("heading", {
        name: "Duplicate Frontend should not render",
      })
    ).not.toBeInTheDocument();
  });
});
