import {
  toSerializableArticleListItem,
  toSerializableProjectListItem,
} from "@/lib/discovery/public-discovery";
import { describe, expect, it } from "vitest";

describe("public discovery projections", () => {
  it("keeps only evidence-safe project card fields", () => {
    const project = toSerializableProjectListItem({
      _id: { toString: () => "project-id" },
      slug: "queue-platform",
      name: "Queue platform",
      description: "A bounded delivery system.",
      role: "  Lead engineer\u0000\n and systems architect  ",
      status: "completed",
      publication_status: "published",
      client: { email: "private@example.com" },
      tags: ["Node.js", "Redis"],
      outcomes: [
        {
          label: "Replay coverage",
          value: "100%",
          verification_state: "verified",
          evidence_reference: "private-dashboard",
        },
        {
          label: "Latency",
          value: "2 ms",
          verification_state: "unverified",
        },
      ],
      is_featured: true,
      is_premium: false,
    });

    expect(project).toMatchObject({
      _id: "project-id",
      slug: "queue-platform",
      role: "Lead engineer and systems architect",
      outcomes: [
        {
          label: "Replay coverage",
          value: "100%",
          verification_state: "verified",
        },
      ],
    });
    expect(project).not.toHaveProperty("publication_status");
    expect(project).not.toHaveProperty("client");
    expect(project?.outcomes?.[0]).not.toHaveProperty("evidence_reference");
  });

  it("serializes safe article author and published/updated dates", () => {
    const article = toSerializableArticleListItem({
      _id: { toString: () => "article-id" },
      slug: "safe-boundaries",
      name: "Safe boundaries",
      status: "published",
      author: {
        _id: { toString: () => "author-id" },
        name: "Foysal Ahmed",
        email: "private@example.com",
      },
      reading_time_minutes: 7,
      published_at: new Date("2025-01-01T00:00:00.000Z"),
      updated_at: new Date("2025-02-01T00:00:00.000Z"),
      is_featured: false,
      is_premium: false,
    });

    expect(article).toMatchObject({
      slug: "safe-boundaries",
      author: { _id: "author-id", name: "Foysal Ahmed" },
      reading_time_minutes: 7,
      published_at: "2025-01-01T00:00:00.000Z",
      updated_at: "2025-02-01T00:00:00.000Z",
    });
    expect(article).not.toHaveProperty("status");
    expect(article?.author).not.toHaveProperty("email");
  });
});
