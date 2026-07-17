import {
  PUBLIC_DISCOVERY_MAX_PAGE,
  buildArticleDiscoveryRepositoryQuery,
  buildProjectDiscoveryRepositoryQuery,
  mergeArticleDiscoveryQueryString,
  mergeProjectDiscoveryQueryString,
  parseArticleDiscoveryQuery,
  parseProjectDiscoveryQuery,
} from "@/lib/discovery/public-discovery";
import { describe, expect, it } from "vitest";

describe("public discovery query contracts", () => {
  it("normalizes a project URL into bounded, allowlisted filters", () => {
    const query = parseProjectDiscoveryQuery(
      new URLSearchParams(
        "search=%20event+systems%20&pillar=backend&category=Platform-Work&technology=Node.js&type=client&year=2025&sort=newest&page=999999"
      )
    );

    expect(query).toEqual({
      search: "event systems",
      pillar: "backend",
      category: "platform-work",
      technology: "Node.js",
      type: "client",
      year: 2025,
      sort: "newest",
      page: PUBLIC_DISCOVERY_MAX_PAGE,
    });
  });

  it("rejects operator-shaped, control-character, enum, and year input", () => {
    const query = parseProjectDiscoveryQuery({
      search: "unsafe\u0000query",
      pillar: "$ne",
      category: "[$gt]",
      technology: "Node\u0007",
      type: "secret",
      year: 1899,
      sort: "$natural",
      page: -3,
    });

    expect(query).toEqual({
      search: "",
      pillar: "all",
      category: "all",
      technology: "all",
      type: "all",
      year: null,
      sort: "featured",
      page: 1,
    });
  });

  it("uses stable category slugs in URLs while preserving campaign context", () => {
    const query = parseArticleDiscoveryQuery({
      pillar: "system_design",
      category: "architecture",
      topic: "Event sourcing",
      sort: "featured",
      page: 2,
    });

    expect(mergeArticleDiscoveryQueryString("?utm_source=profile", query)).toBe(
      "?utm_source=profile&pillar=system_design&category=architecture&topic=Event+sourcing&sort=featured&page=2"
    );
  });

  it("removes project defaults instead of leaving ambiguous URL state", () => {
    expect(
      mergeProjectDiscoveryQueryString(
        "?pillar=backend&type=client&page=4&utm_medium=referral",
        parseProjectDiscoveryQuery({})
      )
    ).toBe("?utm_medium=referral");
  });

  it("translates friendly project filters into a fixed repository query", () => {
    const repositoryQuery = buildProjectDiscoveryRepositoryQuery(
      parseProjectDiscoveryQuery({
        search: "queues",
        pillar: "backend",
        category: "platform",
        technology: "Redis",
        type: "internal",
        year: 2024,
        sort: "oldest",
        page: 3,
      }),
      "507f1f77bcf86cd799439011"
    );

    expect(repositoryQuery).toEqual({
      page: "3",
      limit: "9",
      sort: "started_at,name,_id",
      search: "queues",
      primary_pillar: "backend",
      category: "507f1f77bcf86cd799439011",
      tags: "Redis",
      project_type: "internal",
      year: "2024",
    });
  });

  it("fails a missing category closed and maps article topics exactly", () => {
    const repositoryQuery = buildArticleDiscoveryRepositoryQuery(
      parseArticleDiscoveryQuery({
        category: "missing-category",
        topic: "Threat modeling",
      })
    );

    expect(repositoryQuery.category).toBe("000000000000000000000000");
    expect(repositoryQuery.topics).toBe("Threat modeling");
    expect(repositoryQuery.sort).toBe("-published_at,name,_id");
  });

  it("keeps Page automatic scope active across discovery filters", () => {
    expect(
      buildProjectDiscoveryRepositoryQuery(
        parseProjectDiscoveryQuery({ pillar: "frontend", type: "client" }),
        undefined,
        { featured: true, pillar: "backend", project_type: "lab" }
      )
    ).toMatchObject({
      is_featured: "true",
      primary_pillar: "__page_scope_mismatch__",
      project_type: "__page_scope_mismatch__",
    });
    expect(
      buildArticleDiscoveryRepositoryQuery(
        parseArticleDiscoveryQuery({}),
        undefined,
        { featured: false, pillar: "system_design" }
      )
    ).toMatchObject({
      is_featured: "false",
      primary_pillar: "system_design",
    });
  });
});
