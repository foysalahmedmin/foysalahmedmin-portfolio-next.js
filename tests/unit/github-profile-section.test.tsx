// @vitest-environment jsdom

import type { TPublicSiteDto } from "@/app/api/site/site.type";
import GithubProfileSection from "@/components/sections/github-profile-section";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

const siteWith = (links: TPublicSiteDto["social_links"]): TPublicSiteDto => ({
  ...createEmergencyPublicSite(),
  social_links: links,
});

describe("GithubProfileSection", () => {
  afterEach(cleanup);

  it("links to the owner's public GitHub profile", () => {
    render(
      <GithubProfileSection
        site={siteWith([
          {
            key: "github",
            platform: "github",
            label: "GitHub",
            url: "https://github.com/foysalahmedmin",
            enabled: true,
          },
        ])}
        heading="Open code"
      />
    );

    expect(
      screen.getByRole("heading", { name: "Open code" })
    ).toBeInTheDocument();
    const link = screen.getByRole("link", { name: /@foysalahmedmin/i });
    expect(link).toHaveAttribute("href", "https://github.com/foysalahmedmin");
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });

  it("renders nothing without an enabled GitHub link", () => {
    const { container } = render(
      <GithubProfileSection
        site={siteWith([
          {
            key: "github",
            platform: "github",
            label: "GitHub",
            url: "https://github.com/foysalahmedmin",
            enabled: false,
          },
        ])}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("ignores links that are not on github.com", () => {
    const { container } = render(
      <GithubProfileSection
        site={siteWith([
          {
            key: "github",
            platform: "github",
            label: "GitHub",
            url: "https://evil.example/foysalahmedmin",
            enabled: true,
          },
        ])}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });
});
