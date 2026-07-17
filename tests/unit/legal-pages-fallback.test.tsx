// @vitest-environment jsdom

import PrivacyPage, {
  generateMetadata as generatePrivacyMetadata,
} from "@/app/(common)/privacy/page";
import TermsPage, {
  generateMetadata as generateTermsMetadata,
} from "@/app/(common)/terms/page";
import { createEmergencyPublicSite } from "@/app/api/site/site.policy";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicPagePayloadOrFallback: vi.fn(),
}));

vi.mock("@/lib/pages/public-page-fallback", () => ({
  getPublicPagePayloadOrFallback: mocks.getPublicPagePayloadOrFallback,
}));

describe("legal page unavailable fallback", () => {
  afterEach(cleanup);

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
      mocks.getPublicPagePayloadOrFallback.mockResolvedValue({
        page: {
          route_key: type,
          route_path: `/${type}`,
          locale: "en",
          schema_version: 1,
          contract_version: 1,
          published_revision: 0,
          published_at: "1970-01-01T00:00:00.000Z",
          seo: { noindex: true },
        },
        site: createEmergencyPublicSite(),
        sections: [
          {
            key: type,
            kind: "legal-document",
            layout: "document",
            source_mode: "automatic",
            items: [],
            health: {
              status: "unavailable",
              requested_records: 1,
              resolved_records: 0,
              omitted_records: 0,
              reason_codes: ["source_unavailable"],
            },
          },
        ],
        health: {
          status: "degraded",
          total_sections: 1,
          healthy_sections: 0,
          degraded_sections: 1,
          resolved_records: 0,
          omitted_records: 0,
        },
      });

      render(await page());
      const pageMetadata = await metadata();

      expect(
        screen.getByRole("heading", { name: "Reviewed copy is pending" })
      ).toBeInTheDocument();
      expect(pageMetadata.robots).toMatchObject({
        index: false,
        follow: true,
      });
      expect(mocks.getPublicPagePayloadOrFallback).toHaveBeenCalledWith(type);
    }
  );
});
