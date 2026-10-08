import { toPublicCaseStudyDto, toPublicVideoDto } from "@/app/api/public-content.dto";
import { describe, expect, it } from "vitest";

describe("public case study projection", () => {
  const record = {
    _id: { toJSON: () => "507f1f77bcf86cd799439011" },
    name: "Story",
    status: "published",
    slug_history: [{ slug: "old" }],
    layout: "default",
    expired_at: null,
    client_name: "Acme Ltd",
    show_client_name: false,
    live_url: "https://example.com",
    live_url_visibility: "hidden",
    source_url: "https://github.com/x/y",
    source_url_visibility: "public",
    published_at: new Date("2026-01-01T00:00:00Z"),
    outcomes: [
      { label: "A", value: "1", verification_state: "verified", evidence_reference: "private-ticket" },
      { label: "B", value: "2", verification_state: "derived" },
      { label: "C", value: "3", verification_state: "unverified" },
    ],
  };

  it("hides the client name, private links, drafts' state and unverified claims", () => {
    const dto = toPublicCaseStudyDto(record);
    expect(dto).not.toHaveProperty("status");
    expect(dto).not.toHaveProperty("slug_history");
    expect(dto).not.toHaveProperty("client_name");
    expect(dto).not.toHaveProperty("show_client_name");
    expect(dto).not.toHaveProperty("live_url");
    expect(dto).toHaveProperty("source_url", "https://github.com/x/y");
    expect(dto).not.toHaveProperty("live_url_visibility");
    expect((dto.outcomes as { label: string }[]).map((o) => o.label)).toEqual(["A", "B"]);
    expect(JSON.stringify(dto)).not.toContain("private-ticket");
  });

  it("shows the client name only when the author opted in, and returns plain data", () => {
    const dto = toPublicCaseStudyDto({ ...record, show_client_name: true });
    expect(dto.client_name).toBe("Acme Ltd");
    expect(dto._id).toBe("507f1f77bcf86cd799439011");
    expect(dto.published_at).toBe("2026-01-01T00:00:00.000Z");
  });
});

describe("public video projection", () => {
  it("removes editorial state and returns serializable data", () => {
    const dto = toPublicVideoDto({
      _id: { toJSON: () => "507f1f77bcf86cd799439011" },
      name: "Clip",
      status: "published",
      slug_history: [],
      layout: "default",
      expired_at: new Date(),
      youtube_id: "dQw4w9WgXcQ",
      published_at: new Date("2026-02-03T00:00:00Z"),
    });
    expect(dto).toEqual({
      _id: "507f1f77bcf86cd799439011",
      name: "Clip",
      youtube_id: "dQw4w9WgXcQ",
      published_at: "2026-02-03T00:00:00.000Z",
    });
  });
});
