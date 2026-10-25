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

  it("renders the three roles as stacked panels with their art and proof links, and no numbers", () => {
    const site = createEmergencyPublicSite();
    const { container } = render(
      <PillarShowcaseSection pillars={site.pillars} />
    );

    expect(
      screen.getByRole("heading", {
        name: "Three ways I help you move forward",
      })
    ).toBeInTheDocument();
    for (const pillar of site.pillars) {
      expect(
        screen.getByRole("heading", { name: pillar.label })
      ).toBeInTheDocument();
    }
    expect(container.querySelectorAll(".stack-panel")).toHaveLength(3);
    expect(
      screen.getAllByRole("link", { name: /See projects/ })[0]
    ).toHaveAttribute("href", "/projects?pillar=system_architect");
    expect(
      screen.getAllByRole("link", { name: "Read articles" })[2]
    ).toHaveAttribute("href", "/articles?pillar=ai_automation");
    // The art is the role's own generated hero, decorative, and the panels stack in order
    const sources = Array.from(container.querySelectorAll("img")).map((image) =>
      image.getAttribute("src")
    );
    expect(sources).toEqual([
      "/images/hero/derivatives/system-architect.desktop.q82.webp",
      "/images/hero/derivatives/software-developer.desktop.q82.webp",
      "/images/hero/derivatives/ai-automation.desktop.q82.webp",
    ]);
    for (const image of container.querySelectorAll("img")) {
      expect(image).toHaveAttribute("alt", "");
    }
    // No "01", "02" or "1." labels anywhere in the cards
    expect(container.textContent).not.toMatch(/\b0[1-9]\b/);
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

    render(<PillarShowcaseSection pillars={scrambled} />);

    const projectLinks = screen.getAllByRole("link", { name: /See projects/ });
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
