// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import PillarShowcaseSection from "@/components/sections/pillar-showcase-section";
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
});
