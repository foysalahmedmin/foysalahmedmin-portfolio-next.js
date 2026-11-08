// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import AboutDetailsSection from "@/components/(common)/about-page/about-details-section";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/ui/optimized-media", () => ({
  default: ({ alt }: { alt?: string }) => <img alt={alt || ""} />,
}));
vi.mock("@/components/motion/parallax-layer", () => ({
  default: ({
    children,
    depth,
    className,
  }: {
    children?: React.ReactNode;
    depth?: string;
    className?: string;
  }) => (
    <div data-parallax-layer={depth} className={className}>
      {children}
    </div>
  ),
}));

const withPortrait = (alt_text?: string) => {
  const site = createEmergencyPublicSite();
  site.brand.profile = {
    id: "507f1f77bcf86cd799439099",
    url: "https://cdn.example.com/portrait.webp",
    ...(alt_text ? { alt_text } : {}),
  };
  return site;
};

describe("AboutDetailsSection", () => {
  afterEach(cleanup);

  it("frames the portrait with a media wipe and a parallax layer, with its alt text", () => {
    const { container } = render(
      <AboutDetailsSection site={withPortrait("Portrait of the engineer")} />
    );

    const frame = container.querySelector(".nr-portrait-frame");
    expect(frame).toHaveAttribute("data-reveal", "wipe");
    expect(
      frame?.querySelector("[data-parallax-layer='medium']")
    ).not.toBeNull();
    expect(container.querySelector("img")).toHaveAttribute(
      "alt",
      "Portrait of the engineer"
    );
    expect(container.querySelector("[data-portrait='true']")).not.toBeNull();
  });

  it("keeps the alt text empty when none is published instead of inventing one", () => {
    const { container } = render(<AboutDetailsSection site={withPortrait()} />);
    expect(container.querySelector("img")).toHaveAttribute("alt", "");
  });

  it("uses the owner's fallback profile when there is no portrait", () => {
    const site = createEmergencyPublicSite();
    site.fallbacks.profile = {
      id: "507f1f77bcf86cd799439098",
      url: "https://cdn.example.com/fallback.webp",
      alt_text: "Fallback portrait",
    };
    const { container } = render(<AboutDetailsSection site={site} />);
    expect(container.querySelector("img")).toHaveAttribute(
      "alt",
      "Fallback portrait"
    );
  });

  it("is a calm typographic column when there is no portrait file", () => {
    const { container } = render(
      <AboutDetailsSection site={createEmergencyPublicSite()} />
    );
    expect(container.querySelector("img")).toBeNull();
    expect(container.querySelector("figure")).toBeNull();
    expect(container.querySelector("[data-parallax-layer]")).toBeNull();
    expect(container.querySelector("[data-portrait='false']")).not.toBeNull();
    expect(
      screen.getByRole("heading", { name: "Who is solving your problem." })
    ).toBeInTheDocument();
  });

  it("renders the long positioning, the long bio and the client promise", () => {
    const site = createEmergencyPublicSite();
    site.positioning = {
      ...site.positioning,
      long: "I start with the problem, then design, build and automate the simplest fix.",
      long_bio: "Longer biography paragraph.",
      client_promise:
        "One accountable owner from first idea to running system.",
    };
    render(<AboutDetailsSection site={site} />);

    expect(
      screen.getByText(
        "I start with the problem, then design, build and automate the simplest fix."
      )
    ).toBeInTheDocument();
    expect(screen.getByText("Longer biography paragraph.")).toBeInTheDocument();
    expect(
      screen.getByText(
        "One accountable owner from first idea to running system."
      )
    ).toBeInTheDocument();
  });

  it("falls back to the canonical statement and drops a duplicate bio and a missing promise", () => {
    const site = createEmergencyPublicSite();
    site.positioning = {
      canonical: "Canonical statement.",
      long_bio: "Canonical statement.",
    };
    const { container } = render(<AboutDetailsSection site={site} />);

    expect(screen.getAllByText("Canonical statement.")).toHaveLength(1);
    expect(container.querySelector(".nr-bio")).toBeNull();
    expect(container.querySelector(".nr-promise")).toBeNull();
  });

  it("says details are being prepared when the Site holds no positioning", () => {
    const site = createEmergencyPublicSite();
    site.positioning = {};
    render(<AboutDetailsSection site={site} />);
    expect(
      screen.getByText("Published practice details are being prepared.")
    ).toBeInTheDocument();
  });

  it("links to the case files, the stack and the contact, with no numbers", () => {
    const { container } = render(
      <AboutDetailsSection site={createEmergencyPublicSite()} />
    );
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"));
    expect(hrefs).toEqual(["/case-studies", "/#services", "/contact"]);
    expect(
      screen.getByRole("link", { name: "Read the case files" })
    ).toBeInTheDocument();
    expect(container.querySelector("ol")).toBeNull();
    expect(container.textContent).not.toMatch(/\b0[1-9]\b/);
  });

  it("compact form uses the short bio, keeps the id and drops the long bio", () => {
    const site = createEmergencyPublicSite();
    site.positioning = {
      short_bio: "Short bio.",
      long: "Long statement.",
      long_bio: "Longer biography paragraph.",
    };
    const { container } = render(
      <AboutDetailsSection site={site} compact id="about" />
    );
    expect(container.querySelector("#about")).not.toBeNull();
    expect(screen.getByText("Short bio.")).toBeInTheDocument();
    expect(screen.queryByText("Long statement.")).not.toBeInTheDocument();
    expect(
      screen.queryByText("Longer biography paragraph.")
    ).not.toBeInTheDocument();
  });
});
