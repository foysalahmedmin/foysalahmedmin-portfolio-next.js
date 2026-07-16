import type { TPublicLegalDocumentDto } from "@/app/api/legal-documents/legal-document.type";
import { ENV } from "@/config";
import { readPublishedLegalDocument } from "@/lib/content/published-legal-document";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPublicList: vi.fn(),
}));

vi.mock("@/app/api/legal-documents/legal-document.service", () => ({
  LegalDocumentService: {
    getPublicList: mocks.getPublicList,
  },
}));

const originalDatabaseUrl = ENV.database_url;

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
      body: "<p>Contact records are retained by policy.</p>",
    },
  ],
};

describe("published legal-document reader", () => {
  afterEach(() => {
    ENV.database_url = originalDatabaseUrl;
    vi.restoreAllMocks();
  });

  it("returns the latest eligible result from the public service", async () => {
    mocks.getPublicList.mockResolvedValue({
      data: [documentFixture],
      meta: { page: 1, limit: 50, total: 1, totalPage: 1 },
    });

    await expect(readPublishedLegalDocument("privacy")).resolves.toEqual(
      documentFixture
    );
    expect(mocks.getPublicList).toHaveBeenCalledWith(
      expect.objectContaining({
        sort: "effective_at",
        direction: -1,
        filters: { type: "privacy" },
      })
    );
  });

  it("returns the honest unavailable state without touching the service when DATABASE_URL is absent", async () => {
    ENV.database_url = "";
    const report = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(readPublishedLegalDocument("terms")).resolves.toBeNull();

    expect(mocks.getPublicList).not.toHaveBeenCalled();
    expect(report).toHaveBeenCalledWith(
      "legal_document_published_reader_unavailable",
      {
        error_code: "database_not_configured",
        document_type: "terms",
      }
    );
  });

  it.each([
    { name: "MongoServerSelectionError" },
    { name: "MongoNetworkTimeoutError" },
    { name: "Error", code: "ECONNREFUSED" },
    { name: "MongoServerError", code: 91 },
  ])("returns null for an unavailable database ($name)", async (shape) => {
    const databaseError = Object.assign(
      new Error("database unavailable"),
      shape
    );
    mocks.getPublicList.mockRejectedValue(databaseError);
    const report = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(readPublishedLegalDocument("privacy")).resolves.toBeNull();
    expect(report).toHaveBeenCalledWith(
      "legal_document_published_reader_unavailable",
      {
        error_code: "database_unavailable",
        document_type: "privacy",
      }
    );
  });

  it("recognizes an unavailable database error nested as a cause", async () => {
    const networkError = Object.assign(new Error("socket unavailable"), {
      code: "ETIMEDOUT",
    });
    mocks.getPublicList.mockRejectedValue(
      Object.assign(new Error("reader failed"), { cause: networkError })
    );
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(readPublishedLegalDocument("privacy")).resolves.toBeNull();
  });

  it.each([
    new TypeError("broken DTO mapper"),
    Object.assign(new Error("invalid Mongo query"), {
      name: "MongoServerError",
      code: 2,
    }),
  ])("does not hide programming or content errors", async (error) => {
    mocks.getPublicList.mockRejectedValue(error);
    const report = vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(readPublishedLegalDocument("privacy")).rejects.toBe(error);
    expect(report).not.toHaveBeenCalled();
  });
});
