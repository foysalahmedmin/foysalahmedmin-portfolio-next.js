// @vitest-environment jsdom

import { legalDocumentDefinition } from "@/app/api/legal-documents/legal-document.definition";
import type { TPublicLegalDocumentDto } from "@/app/api/legal-documents/legal-document.type";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import {
  LegalDocumentUnavailable,
  LegalDocumentView,
} from "@/components/content/legal-document-view";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const documentFixture: TPublicLegalDocumentDto = {
  slug: "privacy-policy",
  locale: "en",
  title: "Privacy Policy",
  summary: "How contact information is handled.",
  secondary_pillars: [],
  sequence: 1,
  is_featured: false,
  published_at: "2026-07-01T00:00:00.000Z",
  type: "privacy",
  document_version: "2.1",
  effective_at: "2026-07-10T00:00:00.000Z",
  reviewed_at: "2026-07-09T00:00:00.000Z",
  sections: [
    {
      key: "retention",
      heading: "Retention",
      body: '<p>Contact records are retained by policy.</p><script>alert("x")</script>',
    },
  ],
};

describe("published legal-document experience", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("keeps a reviewed future revision private until it is effective", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-07-15T00:00:00.000Z"));

    expect(
      legalDocumentDefinition.is_public_record_eligible?.({
        effective_at: "2026-07-14T23:59:59.000Z",
      })
    ).toBe(true);
    expect(
      legalDocumentDefinition.is_public_record_eligible?.({
        effective_at: "2026-07-16T00:00:00.000Z",
      })
    ).toBe(false);
    expect(
      legalDocumentDefinition.is_public_record_eligible?.({
        effective_at: "not-a-date",
      })
    ).toBe(false);
  });

  it("renders version metadata and sanitizes reviewed section HTML", () => {
    const site = createEmergencyPublicSite();
    site.identity.public_name = "Portfolio Owner";
    site.contact.public_email = "owner@example.com";
    const { container } = render(
      <LegalDocumentView document={documentFixture} site={site} />
    );

    expect(screen.getAllByText("Privacy Policy").length).toBeGreaterThan(0);
    expect(screen.getByText("Version 2.1")).toBeInTheDocument();
    expect(screen.getByText("Portfolio Owner")).toBeInTheDocument();
    expect(
      screen.getByText("Contact records are retained by policy.")
    ).toBeInTheDocument();
    expect(container.querySelector("script")).toBeNull();
    expect(
      screen.getByRole("link", { name: "owner@example.com" })
    ).toHaveAttribute("href", "mailto:owner@example.com");
  });

  it("shows an honest noindex-compatible fallback instead of invented copy", () => {
    render(<LegalDocumentUnavailable type="terms" />);

    expect(
      screen.getByRole("heading", { name: "Reviewed copy is pending" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: "Contact about this document" })
    ).toHaveAttribute("href", "/contact");
  });
});
