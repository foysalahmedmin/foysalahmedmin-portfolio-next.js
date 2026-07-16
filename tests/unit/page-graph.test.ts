import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  records: [] as Array<Record<string, unknown>>,
  publishIssues: [] as string[],
}));

const query = () => {
  const chain = {
    select: vi.fn(),
    setOptions: vi.fn(),
    sort: vi.fn(),
    limit: vi.fn(),
    session: vi.fn(),
    lean: vi.fn(async () => state.records),
  };
  chain.select.mockReturnValue(chain);
  chain.setOptions.mockReturnValue(chain);
  chain.sort.mockReturnValue(chain);
  chain.limit.mockReturnValue(chain);
  chain.session.mockReturnValue(chain);
  return chain;
};

vi.mock("@/app/api/pages/page.registry", () => ({
  getPageSectionRegistration: () => ({
    domain: "service",
    definition: {
      model: { find: vi.fn(() => query()) },
      file_fields: [],
      get_publish_issues: () => state.publishIssues,
    },
  }),
}));

import { validatePageGraph } from "@/app/api/pages/page.graph";
import type { TPageDraftSnapshot } from "@/app/api/pages/page.type";

const draft: TPageDraftSnapshot = {
  seo: { noindex: false },
  sections: [
    {
      key: "services",
      kind: "service-collection",
      visible: true,
      layout: "grid",
      item_limit: 1,
      source: { mode: "curated", ids: ["507f1f77bcf86cd799439011"] },
    },
  ],
};

describe("Page publish graph", () => {
  beforeEach(() => {
    state.records = [];
    state.publishIssues = [];
  });

  it("rejects a missing curated reference even in a draft", async () => {
    await expect(
      validatePageGraph({ route_key: "home", snapshot: draft, mode: "draft" })
    ).rejects.toMatchObject({ code: "PAGE_REFERENCE_INVALID" });
  });

  it("rejects publish-trust issues from the referenced domain contract", async () => {
    state.records = [{ _id: "507f1f77bcf86cd799439011", slug: "architecture" }];
    state.publishIssues = ["claim_verification"];
    await expect(
      validatePageGraph({ route_key: "home", snapshot: draft, mode: "publish" })
    ).rejects.toMatchObject({
      code: "PAGE_PUBLISH_GRAPH_INVALID",
      sources: ["sections.0.source.claim_verification"],
    });
  });

  it("projects only stable domain/slug references for public composition", async () => {
    state.records = [
      {
        _id: "507f1f77bcf86cd799439011",
        slug: "architecture",
        private_notes: "must not escape",
      },
    ];
    const graph = await validatePageGraph({
      route_key: "home",
      snapshot: draft,
      mode: "publish",
    });
    expect(graph.references_by_section.get("services")).toEqual([
      { domain: "service", slug: "architecture" },
    ]);
    expect(
      JSON.stringify(graph.references_by_section.get("services"))
    ).not.toContain("private_notes");
  });
});
