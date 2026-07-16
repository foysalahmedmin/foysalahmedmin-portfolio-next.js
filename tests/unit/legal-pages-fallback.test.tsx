// @vitest-environment jsdom

import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import PrivacyPage, {
  generateMetadata as generatePrivacyMetadata,
} from "@/app/(common)/privacy/page";
import TermsPage, {
  generateMetadata as generateTermsMetadata,
} from "@/app/(common)/terms/page";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  readPublishedLegalDocument: vi.fn(),
  readPublishedSite: vi.fn(),
}));

vi.mock("@/lib/content/published-legal-document", () => ({
  readPublishedLegalDocument: mocks.readPublishedLegalDocument,
}));

vi.mock("@/lib/site/published-site", () => ({
  readPublishedSite: mocks.readPublishedSite,
}));

describe("legal page unavailable fallback", () => {
  afterEach(() => {
    cleanup();
  });

  it.each([
    {
      type: "privacy" as const,
      page: PrivacyPage,
      metadata: generatePrivacyMetadata,
    },
    {
      type: "terms" as const,
      page: TermsPage,
      metadata: generateTermsMetadata,
    },
  ])(
    "renders and marks the $type fallback noindex when no reviewed document is available",
    async ({ type, page, metadata }) => {
      mocks.readPublishedSite.mockResolvedValue(createEmergencyPublicSite());
      mocks.readPublishedLegalDocument.mockResolvedValue(null);

      render(await page());
      const pageMetadata = await metadata();

      expect(
        screen.getByRole("heading", { name: "Reviewed copy is pending" })
      ).toBeInTheDocument();
      expect(pageMetadata.robots).toMatchObject({
        index: false,
        follow: true,
      });
      expect(mocks.readPublishedLegalDocument).toHaveBeenCalledWith(type);
    }
  );
});
