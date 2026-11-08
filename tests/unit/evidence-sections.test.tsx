// @vitest-environment jsdom

import type { TPublicCredentialDto } from "@/app/api/credentials/credential.type";
import type { TPublicTimelineEntryDto } from "@/app/api/timeline/timeline-entry.type";
import {
  CredentialsSection,
  TestimonialsSection,
  TimelineSection,
} from "@/components/sections/evidence-sections";
import type { PillarKey } from "@/lib/content/pillars";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

const base = {
  locale: "en" as const,
  secondary_pillars: [] as PillarKey[],
  sequence: 1,
  is_featured: false,
  published_at: "2026-01-01T00:00:00.000Z",
};

const entry = (
  overrides: Partial<TPublicTimelineEntryDto> & { slug: string }
): TPublicTimelineEntryDto => ({
  ...base,
  title: "Entry",
  type: "experience",
  organization: "Acme Systems",
  position: "Platform engineer",
  started_at: "2021-03-01T00:00:00.000Z",
  ended_at: "2023-06-01T00:00:00.000Z",
  is_current: false,
  highlights: [],
  technologies: [],
  verification: "verified",
  ...overrides,
});

const credential = (
  overrides: Partial<TPublicCredentialDto> & { slug: string }
): TPublicCredentialDto => ({
  ...base,
  title: "Cloud practitioner",
  type: "certification",
  issuer: "Cloud Institute",
  issued_at: "2022-09-01T00:00:00.000Z",
  verification: "verified",
  ...overrides,
});

describe("TimelineSection", () => {
  afterEach(cleanup);

  it("draws a wire the scroll engine can bind, with hairline entries and no numbers", () => {
    const { container } = render(
      <TimelineSection
        entries={[
          entry({
            slug: "a",
            summary: "Ran the platform team.",
            location: "Remote",
            highlights: ["Cut deploy time"],
            technologies: ["TypeScript", "Postgres"],
          }),
          entry({
            slug: "b",
            type: "education",
            organization: "State University",
            position: "BSc Computer Science",
            started_at: "2019-09-01T00:00:00.000Z",
            is_current: true,
            ended_at: undefined,
          }),
        ]}
      />
    );

    const wire = container.querySelector("[data-scroll-progress]");
    expect(wire).not.toBeNull();
    expect(wire).toHaveAttribute("data-progress-range", "top 60%,bottom 60%");
    expect(wire?.querySelector(".nr-rail .nr-fill")).not.toBeNull();
    expect(wire?.querySelector(".nr-rail .nr-pulse")).not.toBeNull();

    expect(
      screen.getByRole("list", { name: "Experience and education" })
    ).toBeInTheDocument();
    const entries = Array.from(container.querySelectorAll("li.nr-entry"));
    expect(entries).toHaveLength(2);
    // Each entry carries its place along the wire for the lit effect
    expect(
      entries.map((li) => (li as HTMLElement).style.getPropertyValue("--at"))
    ).toEqual(["0.0000", "0.5000"]);

    expect(
      screen.getByRole("heading", { level: 3, name: "Platform engineer" })
    ).toBeInTheDocument();
    expect(screen.getByText("Acme Systems · Remote")).toBeInTheDocument();
    expect(screen.getByText("Ran the platform team.")).toBeInTheDocument();
    expect(screen.getByText("Cut deploy time")).toBeInTheDocument();
    expect(screen.getByText("TypeScript · Postgres")).toBeInTheDocument();
    expect(screen.getByText("Mar 2021")).toHaveAttribute(
      "datetime",
      "2021-03-01T00:00:00.000Z"
    );
    expect(screen.getByText("Sep 2019")).toBeInTheDocument();
    expect(screen.getByText("Jun 2023")).toBeInTheDocument();
    expect(screen.getByText(/– Present/)).toBeInTheDocument();
    expect(container.querySelector(".nr-entry ol")).toBeNull();
    expect(container.textContent).not.toMatch(/\b0[1-9]\b/);
  });

  it("names the section from the page heading and keeps the wire out of the accessibility tree", () => {
    const { container } = render(
      <TimelineSection
        entries={[entry({ slug: "a" })]}
        heading="Where I have worked"
      />
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Where I have worked" })
    ).toBeInTheDocument();
    expect(container.querySelector(".nr-rail")).toHaveAttribute(
      "aria-hidden",
      "true"
    );
  });

  it("keeps the notice when the reader is unavailable and draws no wire", () => {
    const { container } = render(<TimelineSection entries={[]} unavailable />);
    expect(
      screen.getByText("Timeline records are temporarily unavailable")
    ).toBeInTheDocument();
    expect(container.querySelector("[data-scroll-progress]")).toBeNull();
  });
});

describe("CredentialsSection", () => {
  afterEach(cleanup);

  it("lists verified credentials as hairline rows with issuer and date, and no badge", () => {
    const { container } = render(
      <CredentialsSection
        credentials={[
          credential({
            slug: "a",
            summary: "Covers core services.",
            credential_url: "https://verify.example.com/abc",
          }),
          credential({
            slug: "b",
            title: "Security basics",
            issuer: "Sec Academy",
            credential_url: "http://insecure.example.com/x",
          }),
        ]}
      />
    );

    expect(container.querySelectorAll("li.nr-cred")).toHaveLength(2);
    expect(
      screen.getByRole("heading", { level: 3, name: "Cloud practitioner" })
    ).toBeInTheDocument();
    expect(screen.getByText("Cloud Institute · Sep 2022")).toBeInTheDocument();
    expect(screen.getByText("Covers core services.")).toBeInTheDocument();
    expect(screen.queryByText("Verified")).not.toBeInTheDocument();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "https://verify.example.com/abc");
    expect(links[0]).toHaveAttribute("rel", "noopener noreferrer");
    expect(links[0]).toHaveAttribute("target", "_blank");
    expect(links[0]).toHaveTextContent("Verify with issuer");
    expect(links[0]).toHaveTextContent("Cloud practitioner");
  });

  it("keeps the notice when the reader is unavailable", () => {
    render(<CredentialsSection credentials={[]} unavailable />);
    expect(
      screen.getByText("Credentials are temporarily unavailable")
    ).toBeInTheDocument();
  });
});

describe("TestimonialsSection", () => {
  afterEach(cleanup);

  it("shows an evidence-based trust alternative when no verified testimonials are public", () => {
    render(<TestimonialsSection testimonials={[]} />);

    expect(screen.getByText("No public testimonials yet")).toBeInTheDocument();
    expect(
      screen.getByText(/Trust is represented by review gates/)
    ).toBeInTheDocument();
    expect(screen.getByText("Verified records only")).toBeInTheDocument();
    expect(screen.getByText("No placeholder client proof")).toBeInTheDocument();
  });
});
