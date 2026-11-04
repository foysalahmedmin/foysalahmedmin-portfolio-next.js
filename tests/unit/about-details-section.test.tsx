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

  it("keeps practice areas in canonical pillar order", () => {
    const site = createEmergencyPublicSite();
    site.pillars = [...site.pillars].reverse();

    render(<AboutDetailsSection site={site} />);

    const disciplineList = screen.getByRole("list", {
      name: "Practice areas",
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

  it("reads as one column: a short title, the statement as the lead, the three roles' art when there is no portrait, and no numbers", () => {
    const site = createEmergencyPublicSite();
    site.positioning = {
      ...site.positioning,
      compact: "Connected product engineering",
      long: "I start with the problem, then design, build and automate the simplest fix.",
      long_bio: "Longer biography paragraph.",
    };
    const { container } = render(<AboutDetailsSection site={site} />);

    expect(
      screen.getByRole("heading", { name: "Connected product engineering" })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        "I start with the problem, then design, build and automate the simplest fix."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Longer biography paragraph.")).toBeInTheDocument();
    expect(
      Array.from(container.querySelectorAll(".about-art img")).map((image) =>
        image.getAttribute("src")
      )
    ).toEqual([
      "/images/hero/derivatives/system-architect.desktop.q82.webp",
      "/images/hero/derivatives/software-developer.desktop.q82.webp",
      "/images/hero/derivatives/ai-automation.desktop.q82.webp",
    ]);
    expect(container.querySelector("ol")).toBeNull();
    expect(container.textContent).not.toMatch(/\b0[1-9]\b/);
  });

  it("uses the portrait when there is one, and the compact form drops the process", () => {
    const site = createEmergencyPublicSite();
    site.brand.profile = {
      id: "507f1f77bcf86cd799439099",
      url: "https://cdn.example.com/portrait.webp",
      alt_text: "Portrait",
    };
    site.process = [{ key: "a", title: "Step A", summary: "x", enabled: true }];
    const { container } = render(
      <AboutDetailsSection site={site} compact id="about" />
    );
    expect(container.querySelector(".about-art")).toBeNull();
    expect(container.querySelector("img")).toHaveAttribute("alt", "Portrait");
    expect(container.querySelector("#about")).not.toBeNull();
    expect(screen.queryByText("Operating principles")).not.toBeInTheDocument();
  });
});
