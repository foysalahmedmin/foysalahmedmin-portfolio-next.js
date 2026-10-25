// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import SiteHeroSection from "@/components/sections/site-hero-section";
import { HERO_COPY } from "@/lib/site/public-hero";
import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

// The parallax layer needs the motion providers; the canvas has its own tests
vi.mock("@/components/motion/parallax-layer", () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
}));
vi.mock("@/components/three/hero-canvas", () => ({
  HeroCanvas: ({ enabled }: { enabled: boolean }) => (
    <div data-hero-canvas="" data-enabled={String(enabled)} />
  ),
}));

afterEach(cleanup);

const emergency = createEmergencyPublicSite();
// The emergency site has no copy yet; give each role a plain line and four capabilities (only three show)
const site = {
  ...emergency,
  pillars: emergency.pillars.map((pillar, index) => ({
    ...pillar,
    headline: `Plain line ${index + 1}`,
    capabilities: ["One", "Two", "Three", "Four"].map(
      (word) => `${word} ${index + 1}`
    ),
  })),
};

describe("SiteHeroSection: the whole story is in the HTML", () => {
  it("leads with the kicker as the page h1 and has exactly one", () => {
    render(<SiteHeroSection site={site} />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    expect(headings[0]).toHaveTextContent(HERO_COPY.kicker);
  });

  it("has all three roles as h2 in order, each with its plain line and three capabilities", () => {
    const { container } = render(<SiteHeroSection site={site} />);
    const titles = screen.getAllByRole("heading", { level: 2 });
    expect(
      titles.map((title) => title.textContent?.replace(/\s+/g, " ").trim())
    ).toEqual(site.pillars.map((pillar) => pillar.label));

    const beats = container.querySelectorAll("[data-pin-beat]");
    expect(beats).toHaveLength(3);
    beats.forEach((beat, index) => {
      const pillar = site.pillars[index]!;
      // The plain line is the pillar headline, or its label when none is set yet
      expect(beat.querySelector(".hero-lead")?.textContent).toBe(
        pillar.headline?.trim() || pillar.label
      );
      const capabilities = within(beat as HTMLElement).getAllByRole("listitem");
      expect(capabilities).toHaveLength(3);
      expect(capabilities[0]!.textContent).toBe(
        site.pillars[index]!.capabilities[0]
      );
      expect(beat.textContent).toContain(`Role ${index + 1} of 3`);
    });
  });

  it("offers both actions before the roles, as links, without needing JavaScript", () => {
    render(<SiteHeroSection site={site} processHref="#working-process" />);
    const primary = screen.getByRole("link", { name: HERO_COPY.primary });
    const secondary = screen.getByRole("link", { name: HERO_COPY.secondary });
    expect(primary).toHaveAttribute("href", "/contact");
    expect(secondary).toHaveAttribute("href", "#working-process");
    // reading order: kicker, actions, roles
    const all = Array.from(document.querySelectorAll("h1, a, h2"));
    expect(all.indexOf(primary)).toBeGreaterThan(
      all.indexOf(screen.getByRole("heading", { level: 1 }))
    );
    expect(all.indexOf(primary)).toBeLessThan(
      all.indexOf(screen.getAllByRole("heading", { level: 2 })[0]!)
    );
  });

  it("shows the role label when a pillar has no plain line yet, and no empty list", () => {
    const bare = createEmergencyPublicSite();
    const { container } = render(<SiteHeroSection site={bare} />);
    expect(container.querySelector(".hero-lead")?.textContent).toBe(
      bare.pillars[0]!.label
    );
    expect(container.querySelector(".hero-caps")).toBeNull();
  });

  it("falls back to the about page when the page has no process section", () => {
    render(<SiteHeroSection site={site} />);
    expect(
      screen.getByRole("link", { name: HERO_COPY.secondary })
    ).toHaveAttribute("href", "/about");
  });

  it("renders a poster for both themes, portrait and landscape, in AVIF and WebP, and hides the decoration", () => {
    const { container } = render(<SiteHeroSection site={site} />);
    const pictures = container.querySelectorAll("picture.hero-poster");
    expect(pictures).toHaveLength(2);
    const sources = Array.from(
      container.querySelectorAll("picture source")
    ).map((source) => source.getAttribute("srcset"));
    for (const theme of ["dark", "light"]) {
      for (const frame of ["landscape", "portrait"]) {
        for (const format of ["avif", "webp"]) {
          // The fallback <img> carries the landscape WebP
          const path = `/images/hero/maquette-${theme}-${frame}.${format}`;
          const present =
            sources.includes(path) ||
            (frame === "landscape" &&
              format === "webp" &&
              Array.from(container.querySelectorAll("picture img")).some(
                (image) => image.getAttribute("src") === path
              ));
          expect(present, path).toBe(true);
        }
      }
    }
    const backdrop = container.querySelector(".hero-backdrop");
    expect(backdrop).toHaveAttribute("aria-hidden", "true");
    for (const image of container.querySelectorAll("picture img")) {
      expect(image).toHaveAttribute("alt", "");
      expect(image).toHaveAttribute("width", "1920");
      expect(image).toHaveAttribute("height", "1080");
    }
  });

  it("keeps the role bar and the scroll cue out of the accessibility tree", () => {
    const { container } = render(<SiteHeroSection site={site} />);
    expect(container.querySelector(".hero-rolebar")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    expect(container.querySelector(".hero-cue")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
    expect(container.querySelector(".hero-rolebar")?.textContent).toContain(
      "System Architect"
    );
  });

  it("passes the kill switch to the canvas and marks the section for the engine", () => {
    const { container, rerender } = render(<SiteHeroSection site={site} />);
    expect(container.querySelector("[data-hero-canvas]")).toHaveAttribute(
      "data-enabled",
      "true"
    );
    rerender(<SiteHeroSection site={site} scene3d={false} />);
    expect(container.querySelector("[data-hero-canvas]")).toHaveAttribute(
      "data-enabled",
      "false"
    );

    const section = container.querySelector("section[data-pin-scene]");
    expect(section).toHaveAttribute("id", "ingress");
    expect(section).toHaveAttribute("data-hero");
    expect(section).not.toHaveAttribute("data-pinned");
  });

  it("gives every beat its position on the story clock for the CSS", () => {
    const { container } = render(<SiteHeroSection site={site} />);
    const beats = Array.from(
      container.querySelectorAll<HTMLElement>(".hero-beat")
    );
    expect(beats.map((beat) => beat.style.getPropertyValue("--i"))).toEqual([
      "0",
      "1",
      "2",
    ]);
    expect(beats.map((beat) => beat.style.getPropertyValue("--first"))).toEqual(
      ["1", "0", "0"]
    );
    expect(beats.map((beat) => beat.style.getPropertyValue("--last"))).toEqual([
      "0",
      "0",
      "1",
    ]);
  });
});
