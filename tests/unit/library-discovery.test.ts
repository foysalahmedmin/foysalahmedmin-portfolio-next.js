import {
  DEFAULT_CASE_STUDY_DISCOVERY_QUERY,
  buildCaseStudyDiscoveryRepositoryQuery,
  hasCaseStudyDiscoveryFilters,
  mergeCaseStudyDiscoveryQueryString,
  normalizeCaseStudyDiscoveryCompositionFilter,
  parseCaseStudyDiscoveryQuery,
  toSerializableCaseStudyListItem,
} from "@/lib/discovery/case-study-discovery";
import {
  DEFAULT_VIDEO_DISCOVERY_QUERY,
  VIDEO_LANE_PAGE_SIZE,
  buildVideoApiRepositoryQuery,
  buildVideoLaneRepositoryQuery,
  hasVideoDiscoveryFilters,
  mergeVideoDiscoveryQueryString,
  normalizeVideoDiscoveryCompositionFilter,
  parseVideoApiQuery,
  parseVideoDiscoveryQuery,
  toSerializableVideoListItem,
} from "@/lib/discovery/video-discovery";
import { describe, expect, it } from "vitest";

describe("video discovery query", () => {
  it("falls back to safe defaults for hostile or unknown input", () => {
    expect(
      parseVideoDiscoveryQuery({
        search: "a\u0000b",
        category: "$where",
        show: "square",
        sort: "random",
        landscape_page: -4,
        reel_page: "abc",
      })
    ).toEqual(DEFAULT_VIDEO_DISCOVERY_QUERY);
  });

  it("round-trips the filters through the URL and drops defaults", () => {
    const query = parseVideoDiscoveryQuery({
      search: "n8n",
      category: "quick-explainers",
      show: "reel",
      sort: "name",
      reel_page: "3",
    });
    expect(query).toMatchObject({ show: "reel", reel_page: 3, sort: "name" });
    const qs = mergeVideoDiscoveryQueryString("?utm=x", query);
    expect(new URLSearchParams(qs).get("utm")).toBe("x");
    expect(parseVideoDiscoveryQuery(new URLSearchParams(qs))).toEqual(query);
    expect(
      mergeVideoDiscoveryQueryString("", DEFAULT_VIDEO_DISCOVERY_QUERY)
    ).toBe("");
    expect(hasVideoDiscoveryFilters(query)).toBe(true);
    expect(hasVideoDiscoveryFilters(DEFAULT_VIDEO_DISCOVERY_QUERY)).toBe(false);
  });

  it("builds one repository query per lane with the lane's own page and size", () => {
    const query = parseVideoDiscoveryQuery({
      landscape_page: "2",
      reel_page: "5",
      search: "design",
    });
    expect(buildVideoLaneRepositoryQuery(query, "landscape", undefined)).toMatchObject({
      aspect_ratio: "landscape",
      page: "2",
      limit: String(VIDEO_LANE_PAGE_SIZE.all.landscape),
      search: "design",
    });
    expect(buildVideoLaneRepositoryQuery(query, "reel", undefined)).toMatchObject({
      aspect_ratio: "reel",
      page: "5",
      limit: String(VIDEO_LANE_PAGE_SIZE.all.reel),
    });
    const focused = { ...query, show: "reel" as const };
    expect(buildVideoLaneRepositoryQuery(focused, "reel", undefined).limit).toBe(
      String(VIDEO_LANE_PAGE_SIZE.reel.reel)
    );
  });

  it("matches nothing for an unknown category instead of ignoring the filter", () => {
    const query = parseVideoDiscoveryQuery({ category: "ghost" });
    expect(buildVideoLaneRepositoryQuery(query, "reel", undefined).category).toBe(
      "000000000000000000000000"
    );
    expect(
      buildVideoLaneRepositoryQuery(query, "reel", "507f1f77bcf86cd799439011")
        .category
    ).toBe("507f1f77bcf86cd799439011");
  });

  it("supports the public API shape and a Page section scope", () => {
    const api = parseVideoApiQuery({ aspect_ratio: "reel", limit: "100", page: "2" });
    expect(api).toMatchObject({ aspect_ratio: "reel", limit: 24, page: 2 });
    expect(buildVideoApiRepositoryQuery(api, undefined, { featured: true })).toMatchObject({
      aspect_ratio: "reel",
      is_featured: "true",
      limit: "24",
    });
    expect(parseVideoApiQuery({}).aspect_ratio).toBe("all");
    expect(normalizeVideoDiscoveryCompositionFilter({ featured: "false" })).toEqual({
      featured: false,
    });
    expect(normalizeVideoDiscoveryCompositionFilter({ featured: "maybe" })).toEqual({});
  });
});

describe("video list item serialization", () => {
  const youtube = {
    _id: { toString: () => "507f1f77bcf86cd799439011" },
    name: "Short",
    slug: "short",
    aspect_ratio: "reel",
    source_type: "youtube",
    youtube_id: "dQw4w9WgXcQ",
    keywords: ["a", 3, "b"],
    published_at: new Date("2026-01-02T00:00:00Z"),
    category: { _id: "c1", name: "Cat", slug: "cat", extra: "x" },
    is_featured: true,
  };

  it("turns a repository record into plain, bounded data", () => {
    const item = toSerializableVideoListItem(youtube)!;
    expect(item).toMatchObject({
      _id: "507f1f77bcf86cd799439011",
      aspect_ratio: "reel",
      source_type: "youtube",
      youtube_id: "dQw4w9WgXcQ",
      keywords: ["a", "b"],
      published_at: "2026-01-02T00:00:00.000Z",
      is_featured: true,
      category: { _id: "c1", name: "Cat", slug: "cat" },
    });
    expect(JSON.parse(JSON.stringify(item))).toEqual(item);
  });

  it("drops records that cannot play", () => {
    expect(toSerializableVideoListItem({ ...youtube, youtube_id: undefined })).toBeNull();
    expect(
      toSerializableVideoListItem({ ...youtube, source_type: "upload", video_file: null })
    ).toBeNull();
    expect(toSerializableVideoListItem({ ...youtube, aspect_ratio: "square" })).toBeNull();
    expect(toSerializableVideoListItem(null)).toBeNull();
    expect(
      toSerializableVideoListItem({
        ...youtube,
        source_type: "upload",
        youtube_id: undefined,
        video_file: { _id: "f1", url: "https://res.cloudinary.com/x/video/upload/a.mp4" },
      })
    ).toMatchObject({ source_type: "upload", video_file: { url: expect.any(String) } });
  });
});

describe("case study discovery query", () => {
  it("round-trips filters and falls back for unknown values", () => {
    const query = parseCaseStudyDiscoveryQuery({
      search: "migration",
      pillar: "system_architect",
      category: "platform-builds",
      technology: "MongoDB",
      sort: "featured",
      page: "2",
    });
    expect(query).toMatchObject({ pillar: "system_architect", technology: "MongoDB", page: 2 });
    const qs = mergeCaseStudyDiscoveryQueryString("", query);
    expect(parseCaseStudyDiscoveryQuery(new URLSearchParams(qs))).toEqual(query);
    expect(hasCaseStudyDiscoveryFilters(query)).toBe(true);
    expect(parseCaseStudyDiscoveryQuery({ pillar: "devops", sort: "x", page: "0" })).toEqual(
      DEFAULT_CASE_STUDY_DISCOVERY_QUERY
    );
  });

  it("maps filters to repository fields and honours a Page scope", () => {
    const query = parseCaseStudyDiscoveryQuery({ pillar: "ai_automation", technology: "n8n" });
    expect(buildCaseStudyDiscoveryRepositoryQuery(query)).toMatchObject({
      primary_pillar: "ai_automation",
      tech_stack: "n8n",
    });
    expect(
      buildCaseStudyDiscoveryRepositoryQuery(query, undefined, { pillar: "system_architect" })
        .primary_pillar
    ).toBe("__page_scope_mismatch__");
    expect(normalizeCaseStudyDiscoveryCompositionFilter({ featured: "true", pillar: "x" })).toEqual({
      featured: true,
    });
  });

  it("serializes only public-safe card data", () => {
    const item = toSerializableCaseStudyListItem({
      _id: "507f1f77bcf86cd799439011",
      name: "Story",
      description: "Summary",
      client_name: "  Acme\u0000  Ltd ",
      primary_pillar: "software_developer",
      engagement_type: "client",
      outcomes: [
        { label: "Kept", value: "1", verification_state: "derived" },
        { label: "Hidden", value: "2", verification_state: "unverified", evidence_reference: "secret" },
      ],
      tech_stack: ["A", 1],
      is_featured: false,
    })!;
    expect(item.client_name).toBe("Acme Ltd");
    expect(item.outcomes).toEqual([{ label: "Kept", value: "1", verification_state: "derived" }]);
    expect(item.tech_stack).toEqual(["A"]);
    expect(JSON.stringify(item)).not.toContain("secret");
  });
});
